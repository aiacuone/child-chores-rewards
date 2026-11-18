/** Who may start the first family: ALLOWED_EMAILS, separated by commas or spaces. */
export function parseAllowedEmails(raw: string | undefined) {
	return new Set(
		(raw ?? '')
			.split(/[\s,]+/)
			.map((email) => email.trim().toLowerCase())
			.filter(Boolean)
	);
}

/** An empty list lets nobody in, so a missing setting never opens the door. */
export function isAllowedEmail(raw: string | undefined, email: string) {
	return parseAllowedEmails(raw).has(email.trim().toLowerCase());
}
