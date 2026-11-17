// The one "send email" function (ADR 0008): the owner's Gmail over SMTP with an
// app password. Moving to another sender later changes only this file.
// Emails are plain text, and neither their text nor the address is logged.
import nodemailer, { type Transporter } from 'nodemailer';
import { GMAIL_APP_PASSWORD, GMAIL_USER, TEST_ROUTES } from '$app/env/private';
import { outbox, type SentEmail } from './outbox';

export class EmailNotSent extends Error {}

let transport: Transporter | undefined;

export async function sendEmail(msg: SentEmail) {
	if (/[\r\n]/.test(msg.to + msg.subject)) throw new EmailNotSent('bad header');
	if (TEST_ROUTES) {
		outbox.emails.push(msg);
		return;
	}
	if (!GMAIL_USER || !GMAIL_APP_PASSWORD) throw new EmailNotSent('Gmail is not set up');
	transport ??= nodemailer.createTransport({
		service: 'gmail',
		auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
	});
	try {
		await transport.sendMail({ from: `Rocket Rewards <${GMAIL_USER}>`, ...msg });
	} catch (e) {
		console.error('email: send failed', (e as { code?: string }).code ?? 'unknown');
		throw new EmailNotSent('send failed');
	}
}
