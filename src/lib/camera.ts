// Whether the browser says the camera is blocked for this site. Not every browser
// can tell, so an unknown answer counts as not blocked and the device's own
// camera screen takes over.
export function watchCamera(onchange: (blocked: boolean) => void) {
	let stop = () => {};
	navigator.permissions
		?.query({ name: 'camera' as PermissionName })
		.then((status) => {
			const report = () => onchange(status.state === 'denied');
			report();
			status.addEventListener('change', report);
			stop = () => status.removeEventListener('change', report);
		})
		.catch(() => {});
	return () => stop();
}

export const PHOTO_FAILED = 'That photo didn’t work. Try another one.';
