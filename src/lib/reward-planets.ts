// The planet colours a reward can have (Add-Reward.dc.html): the body, its
// spots and its ring. The label is what screen readers say for each circle.
// The order here is the order of the circles in the form.
export const PLANETS = {
	pink: { label: 'Pink', body: '#E58FB8', spots: '#bb7596', ring: '#ffabdc' },
	purple: { label: 'Purple', body: '#9C8CF0', spots: '#7f72c4', ring: '#bba8ff' },
	green: { label: 'Green', body: '#5BB58A', spots: '#4a9471', ring: '#6dd9a5' },
	tan: { label: 'Tan', body: '#E0B67A', spots: '#b79564', ring: '#ffda92' },
	blue: { label: 'Blue', body: '#6EC6F0', spots: '#5aa2c4', ring: '#84edff' }
} as const;

export type PlanetId = keyof typeof PLANETS;

export const PLANET_IDS = Object.keys(PLANETS) as [PlanetId, ...PlanetId[]];

export const planet = (id: PlanetId) => PLANETS[id];
