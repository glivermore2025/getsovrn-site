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
      html: `<p>You're officially on the waitlist 🚀<br/>We'll be in touch soon!</p>`,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error });
  }
}
