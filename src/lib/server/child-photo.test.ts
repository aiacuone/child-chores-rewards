import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { removeChild } from './children';
import { childPhotoUrl, readChildPhoto, removeChildPhoto, saveChildPhoto } from './child-photo';
import { openDatabase, schema } from './db';
import { forFamily, type FamilyScope } from './family';
import { childCard } from './flying';
import { MAX_UPLOAD, reencodePhoto } from './image';
import { familyVersion } from './live';

const picture = (width = 200, height = 200) =>
	sharp({ create: { width, height, channels: 3, background: '#3366cc' } });

describe('re-encoding a photo', () => {
	it('turns a JPEG, PNG or WebP into a 400 px square WebP', async () => {
		for (const input of [
			await picture().jpeg().toBuffer(),
			await picture(300, 200).png().toBuffer(),
			await picture().webp().toBuffer()
		]) {
			const output = (await reencodePhoto(input))!;
			expect(await sharp(output).metadata()).toMatchObject({
				format: 'webp',
				width: 400,
				height: 400
			});
		}
	});

	it('drops hidden data such as the location', async () => {
		const input = await picture()
			.withExif({ IFD3: { GPSLatitude: '37/1 49/1 0/1' }, IFD0: { Copyright: 'secret' } })
			.jpeg()
			.toBuffer();
		expect((await sharp(input).metadata()).exif).toBeDefined();
		const output = (await reencodePhoto(input))!;
		const meta = await sharp(output).metadata();
		expect(meta.exif).toBeUndefined();
		expect(output.includes('secret')).toBe(false);
	});

	it('refuses anything that is not a usable photo', async () => {
		const jpeg = await picture().jpeg().toBuffer();
		const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="99" height="99"/>');
		const bad = [
			Buffer.from('this is not an image at all'),
			svg,
			await picture().gif().toBuffer(),
			await picture().tiff().toBuffer(),
			Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]),
			jpeg.subarray(0, 40),
			await picture(20, 20).jpeg().toBuffer(),
			await picture(5000, 100).jpeg({ quality: 10 }).toBuffer(),
			Buffer.concat([jpeg, Buffer.alloc(MAX_UPLOAD)])
		];
		for (const input of bad) expect(await reencodePhoto(input)).toBeNull();
	});
});

describe('storing a child’s photo', () => {
	let opened: ReturnType<typeof openDatabase>;
	let ours: FamilyScope;
	let theirs: FamilyScope;
	let mia: number;
	let leo: number;
	const data = Buffer.from('photo-bytes');

	beforeEach(() => {
		opened = openDatabase(':memory:');
		const [a, b] = opened.db
			.insert(schema.family)
			.values([{ name: 'Ours' }, { name: 'Theirs' }])
			.returning()
			.all();
		ours = forFamily(opened.db, a.id);
		theirs = forFamily(opened.db, b.id);
		mia = ours.addChild('Mia', 'pink').id;
		leo = ours.addChild('Leo', 'blue').id;
	});
	afterEach(() => opened.sqlite.close());

	it('gives each new photo a new address and refreshes screens', () => {
		const start = familyVersion(ours);
		expect(childCard(ours, mia)?.photo).toBeNull();
		saveChildPhoto(ours, mia, data, 1000);
		const first = childPhotoUrl(ours, mia);
		expect(first).toBe(`/api/photos/child/${mia}?v=1000`);
		expect(childCard(ours, mia)?.photo).toBe(first);
		expect(familyVersion(ours)).toBeGreaterThan(start);
		saveChildPhoto(ours, mia, Buffer.from('next'), 1000);
		expect(childPhotoUrl(ours, mia)).not.toBe(first);
		expect(readChildPhoto(ours, mia)?.data.toString()).toBe('next');
	});

	it('can be taken down', () => {
		saveChildPhoto(ours, mia, data);
		expect(removeChildPhoto(ours, mia)).toBe(true);
		expect(readChildPhoto(ours, mia)).toBeNull();
	});

	it('is deleted with the child', () => {
		saveChildPhoto(ours, leo, data);
		saveChildPhoto(ours, mia, data);
		removeChild(ours, leo);
		const rows = opened.db.select().from(schema.childPhoto).all();
		expect(rows.map((r) => r.childId)).toEqual([mia]);
	});

	it('never reaches another family’s child', () => {
		saveChildPhoto(ours, mia, data);
		expect(readChildPhoto(theirs, mia)).toBeNull();
		expect(childPhotoUrl(theirs, mia)).toBeNull();
		expect(saveChildPhoto(theirs, mia, Buffer.from('x'))).toBe(false);
		expect(removeChildPhoto(theirs, mia)).toBe(false);
		expect(readChildPhoto(ours, mia)?.data.toString()).toBe('photo-bytes');
	});
});
