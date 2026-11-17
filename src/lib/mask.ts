/** Hide most of an email address, as on the screens: "jane@gmail.com" becomes "j•••@gmail.com". */
export function maskEmail(email: string) {
	const at = email.lastIndexOf('@');
	if (at < 1) return '•••';
	return `${email[0]}•••${email.slice(at)}`;
}
