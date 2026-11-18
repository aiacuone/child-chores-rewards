/** A row id from an address, or null when it is not a positive whole number. */
export const rowId = (raw: string | undefined) =>
	raw && /^\d{1,9}$/.test(raw) && Number(raw) > 0 ? Number(raw) : null;
