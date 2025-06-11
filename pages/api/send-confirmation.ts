// pages/api/send-confirmation.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const { email } = req.body;

  try {
    const data = await resend.emails.send({
      from: 'SOVRN <noreply@getsovrn.com>',
      to: email,
      subject: 'Thanks for joining the Sovrn waitlist!',
      html: `
  <div style="font-family: sans-serif; color: #1a1a1a;">
    <h2>Welcome to <strong>SOVRN</strong>!</h2>
    <p>You've been added to our waitlist — you're taking control of your data future. 💼</p>
    <p>We'll be in touch with early access, updates, and exclusive opportunities to shape the platform.</p>
    <hr style="margin-top: 20px;" />
    <p style="font-size: 12px; color: #888;">This email was sent from getsovrn.com</p>
  </div>
`,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error });
  }
}
