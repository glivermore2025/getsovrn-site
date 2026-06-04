import Stripe from 'stripe';
import { getSupabaseAdminClient } from './supabaseAdmin';

type RecordedPurchase =
  | { type: 'dataset'; datasetId: string; userId: string; sessionId: string }
  | { type: 'listing'; listingId: string; userId: string; sessionId: string };

function parsePositiveInt(value: string | null | undefined, fallback = 1) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseFilterJson(value: string | null | undefined) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isMissingColumnError(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  return error.code === 'PGRST204' || /column .* does not exist|schema cache/i.test(error.message ?? '');
}

async function getAmountPaidCents(stripe: Stripe, session: Stripe.Checkout.Session) {
  if (typeof session.amount_total === 'number') return session.amount_total;

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  return lineItems.data.reduce((total, item) => {
    return total + (item.price?.unit_amount ?? 0) * (item.quantity ?? 1);
  }, 0);
}

async function recordDatasetPurchase(stripe: Stripe, session: Stripe.Checkout.Session): Promise<RecordedPurchase> {
  const datasetId = session.metadata?.dataset_id;
  const userId = session.metadata?.user_id;

  if (!datasetId || !userId || !session.id) {
    throw new Error('Missing dataset purchase metadata');
  }

  const supabase = getSupabaseAdminClient();
  const quantity = parsePositiveInt(session.metadata?.quantity, 1);
  const filterJson = parseFilterJson(session.metadata?.filter_json);
  const amountPaidCents = await getAmountPaidCents(stripe, session);
  const currency = session.currency ?? 'usd';

  const expandedPurchase = {
    dataset_id: datasetId,
    buyer_user_id: userId,
    stripe_session_id: session.id,
    gross_revenue_cents: amountPaidCents,
    currency,
    quantity,
    filter_json: filterJson,
    amount_paid: amountPaidCents,
    status: 'completed',
  };

  const { error: expandedError } = await supabase
    .from('dataset_purchases')
    .upsert([expandedPurchase], { onConflict: 'stripe_session_id' });

  if (expandedError) {
    if (!isMissingColumnError(expandedError)) {
      throw expandedError;
    }

    const { error: fallbackError } = await supabase.from('dataset_purchases').upsert(
      [
        {
          dataset_id: datasetId,
          buyer_user_id: userId,
          stripe_session_id: session.id,
          gross_revenue_cents: amountPaidCents,
          currency,
        },
      ],
      { onConflict: 'stripe_session_id' }
    );

    if (fallbackError) throw fallbackError;
  }

  await supabase.from('dataset_sales').upsert(
    [
      {
        dataset_id: datasetId,
        buyer_id: userId,
        quantity,
        gross_amount: amountPaidCents / 100,
        session_id: session.id,
        purchased_at: new Date().toISOString(),
      },
    ],
    { onConflict: 'session_id' }
  );

  return { type: 'dataset', datasetId, userId, sessionId: session.id };
}

async function recordListingPurchase(session: Stripe.Checkout.Session): Promise<RecordedPurchase> {
  const userId = session.metadata?.user_id;
  const listingId = session.metadata?.listing_id;

  if (!userId || !listingId || !session.id) {
    throw new Error('Missing listing purchase metadata');
  }

  const supabase = getSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from('purchases')
    .select('id')
    .eq('session_id', session.id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existing) {
    const { error } = await supabase.from('purchases').insert([
      {
        user_id: userId,
        listing_id: listingId,
        session_id: session.id,
      },
    ]);

    if (error) throw error;
  }

  return { type: 'listing', listingId, userId, sessionId: session.id };
}

export async function recordCheckoutSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<RecordedPurchase | null> {
  const sessionType = session.metadata?.type;

  if (sessionType === 'dataset') {
    return recordDatasetPurchase(stripe, session);
  }

  if (sessionType === 'listing') {
    return recordListingPurchase(session);
  }

  return null;
}
