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
  <div style="font-family: Arial, sans-serif; background: #f8f9fb; padding: 40px; color: #1a1a1a;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 30px; text-align: center;">
      <img src="https://getsovrn.com/logo.png" alt="Sovrn Logo" style="width: 120px; margin-bottom: 20px;" />
      <h1 style="font-size: 24px; color: #1a1a1a;">Welcome to Sovrn!</h1>
      <p style="font-size: 16px; line-height: 1.5; color: #333;">
        You've officially joined the waitlist. You're taking the first step toward owning and monetizing your data.
      </p>
      <p style="font-size: 16px; line-height: 1.5; color: #333;">
        We'll keep you updated on early access, product news, and opportunities to shape the future of data ownership.
      </p>
      <a href="https://getsovrn.com" style="display: inline-block; margin-top: 25px; padding: 12px 24px; background-color: #003366; color: #ffffff; text-decoration: none; border-radius: 6px;">Visit Website</a>
      <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">Sovrn, Inc. • getsovrn.com</p>
    </div>
  </div>
`,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error });
  }
}
