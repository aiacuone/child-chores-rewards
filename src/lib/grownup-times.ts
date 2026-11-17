// Times shared by the page and the server for grown-up mode (ADR 0007).
/** Grown-up mode locks after this long without a touch. Settings changes it in #31. */
export const AUTO_LOCK = 2 * 60 * 1000;
/** "Locking soon" shows for this long before it locks. */
export const LOCK_WARNING = 10 * 1000;
