// Email the confirm link for a new recovery email (setup step 3 and Settings).
// A link whose email fails is removed, so it neither works nor counts as sent.
import { EmailNotSent, sendEmail } from './email';
import type { FamilyScope } from './family';
import { TooManyEmails, dropLink, startVerification } from './recovery-email';

export async function sendConfirmLink(scope: FamilyScope, email: string, origin: string) {
	let link: { token: string; id: number };
	try {
		link = startVerification(scope, email);
	} catch (e) {
		if (e instanceof TooManyEmails) return 'tooMany' as const;
		throw e;
	}
	try {
		await sendEmail({
			to: email,
			subject: 'Confirm your Rocket Rewards recovery email',
			text: `Open this link to use this address for PIN reset codes: ${origin}/verify-email?token=${link.token}\n\nThe link works for 24 hours. If you didn't ask for this, you can ignore this email.`
		});
	} catch (e) {
		if (!(e instanceof EmailNotSent)) throw e;
		dropLink(scope, link.id);
		return 'notSent' as const;
	}
	return 'sent' as const;
}
