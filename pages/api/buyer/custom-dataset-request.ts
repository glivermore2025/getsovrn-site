import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { requireAuthenticatedUser } from '../../../lib/apiAuth';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';

const REQUEST_INBOX = 'requests@getsovrn.com';
const FROM_EMAIL = 'Sovrn Requests <noreply@getsovrn.com>';

type CustomDatasetRequestPayload = {
  buyerName?: unknown;
  companyName?: unknown;
  email?: unknown;
  targetGeography?: unknown;
  dataCategory?: unknown;
  useCase?: unknown;
  refreshCadence?: unknown;
  aggregationLevel?: unknown;
  timeline?: unknown;
  budgetRange?: unknown;
  notes?: unknown;
};

type NotificationResult = {
  sent: boolean;
  error?: string;
};

function cleanText(value: unknown, maxLength = 2000) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderField(label: string, value: string) {
  return `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 180px;">${escapeHtml(label)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #111827;">${escapeHtml(value || 'Not provided')}</td>
    </tr>
  `;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let user;
  try {
    user = await requireAuthenticatedUser(req);
  } catch {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const payload = req.body as CustomDatasetRequestPayload;
  const buyerName = cleanText(payload.buyerName, 200);
  const companyName = cleanText(payload.companyName, 200);
  const email = cleanText(payload.email, 320);
  const targetGeography = cleanText(payload.targetGeography, 500);
  const dataCategory = cleanText(payload.dataCategory, 200);
  const useCase = cleanText(payload.useCase, 1000);
  const refreshCadence = cleanText(payload.refreshCadence, 100);
  const aggregationLevel = cleanText(payload.aggregationLevel, 200);
  const timeline = cleanText(payload.timeline, 200);
  const budgetRange = cleanText(payload.budgetRange, 200);
  const notes = cleanText(payload.notes, 4000);

  const requiredFields = [
    ['buyerName', buyerName],
    ['companyName', companyName],
    ['email', email],
    ['targetGeography', targetGeography],
    ['dataCategory', dataCategory],
    ['useCase', useCase],
    ['refreshCadence', refreshCadence],
    ['aggregationLevel', aggregationLevel],
    ['timeline', timeline],
  ];
  const missingFields = requiredFields.filter(([, value]) => !value).map(([field]) => field);

  if (missingFields.length > 0) {
    return res.status(400).json({ error: 'Missing required fields.', missingFields });
  }

  const supabase = getSupabaseAdminClient();
  const { data: request, error: insertError } = await supabase
    .from('custom_dataset_requests')
    .insert([
      {
        buyer_id: user.id,
        buyer_name: buyerName,
        company_name: companyName,
        email,
        target_geography: targetGeography,
        data_category: dataCategory,
        use_case: useCase,
        refresh_cadence: refreshCadence,
        aggregation_level: aggregationLevel,
        timeline,
        budget_range: budgetRange,
        notes,
        status: 'new',
      },
    ])
    .select('id, created_at, status')
    .single();

  if (insertError || !request) {
    console.error('Custom dataset request insert failed', insertError);
    return res.status(500).json({ error: 'Unable to save custom dataset request.' });
  }

  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://getsovrn.com'}/admin/buyer-requests`;
  const agentPayload = {
    event_type: 'custom_dataset_request.created',
    request_id: request.id,
    buyer_id: user.id,
    buyer_name: buyerName,
    company_name: companyName,
    email,
    target_geography: targetGeography,
    data_category: dataCategory,
    use_case: useCase,
    refresh_cadence: refreshCadence,
    aggregation_level: aggregationLevel,
    timeline,
    budget_range: budgetRange,
    notes,
    status: request.status,
    created_at: request.created_at,
    admin_url: adminUrl,
  };
  const notification: NotificationResult = { sent: false };

  if (!process.env.RESEND_API_KEY) {
    notification.error = 'RESEND_API_KEY is not configured.';
  } else {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const textPayload = JSON.stringify(agentPayload, null, 2);
      const emailResult = (await resend.emails.send({
        from: FROM_EMAIL,
        to: REQUEST_INBOX,
        subject: `New custom dataset request: ${companyName} - ${dataCategory}`,
        text: [
          'A new Sovrn custom dataset request was submitted.',
          '',
          'Agent payload:',
          textPayload,
        ].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 32px; color: #111827;">
            <div style="max-width: 720px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
              <div style="padding: 24px 28px; background: #111827; color: #ffffff;">
                <h1 style="margin: 0; font-size: 22px;">New custom dataset request</h1>
                <p style="margin: 8px 0 0; color: #d1d5db;">${escapeHtml(companyName)} requested ${escapeHtml(dataCategory)} data.</p>
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                ${renderField('Request ID', request.id)}
                ${renderField('Buyer ID', user.id)}
                ${renderField('Buyer name', buyerName)}
                ${renderField('Company', companyName)}
                ${renderField('Email', email)}
                ${renderField('Target geography', targetGeography)}
                ${renderField('Data category', dataCategory)}
                ${renderField('Use case', useCase)}
                ${renderField('Refresh cadence', refreshCadence)}
                ${renderField('Aggregation level', aggregationLevel)}
                ${renderField('Timeline', timeline)}
                ${renderField('Budget range', budgetRange)}
                ${renderField('Notes', notes)}
              </table>
              <div style="padding: 24px 28px;">
                <p style="font-size: 13px; color: #6b7280;">Structured agent payload:</p>
                <pre style="white-space: pre-wrap; background: #111827; color: #e5e7eb; border-radius: 8px; padding: 16px; font-size: 12px; line-height: 1.5;">${escapeHtml(textPayload)}</pre>
                <p style="margin-top: 18px;">
                  <a href="${escapeHtml(adminUrl)}" style="display: inline-block; padding: 10px 14px; border-radius: 6px; background: #2563eb; color: #ffffff; text-decoration: none;">Open admin queue</a>
                </p>
              </div>
            </div>
          </div>
        `,
      })) as { error?: { message?: string } };

      if (emailResult?.error) {
        notification.error = emailResult.error.message || 'Resend rejected the notification.';
      } else {
        notification.sent = true;
      }
    } catch (error) {
      console.error('Custom dataset request notification failed', error);
      notification.error = error instanceof Error ? error.message : 'Notification failed.';
    }
  }

  return res.status(201).json({
    success: true,
    request,
    notification,
  });
}
