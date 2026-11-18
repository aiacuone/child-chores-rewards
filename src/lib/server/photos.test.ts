import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { removeChild } from './children';
import { listChores, removeChore } from './chores';
import { listRewards, removeReward } from './rewards';
import { photoUrl, photoUrls, readPhoto, removePhoto, savePhoto } from './photos';
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

describe('storing photos', () => {
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
		savePhoto(ours, 'child', mia, data, 1000);
		const first = photoUrl(ours, 'child', mia);
		expect(first).toBe(`/api/photos/child/${mia}?v=1000`);
		expect(childCard(ours, mia)?.photo).toBe(first);
		expect(familyVersion(ours)).toBeGreaterThan(start);
		savePhoto(ours, 'child', mia, Buffer.from('next'), 1000);
		expect(photoUrl(ours, 'child', mia)).not.toBe(first);
		expect(readPhoto(ours, 'child', mia)?.data.toString()).toBe('next');
	});

	it('can be taken down', () => {
		savePhoto(ours, 'child', mia, data);
		expect(removePhoto(ours, 'child', mia)).toBe(true);
		expect(readPhoto(ours, 'child', mia)).toBeNull();
	});

	it('is deleted with the child', () => {
		savePhoto(ours, 'child', leo, data);
		savePhoto(ours, 'child', mia, data);
		removeChild(ours, leo);
		const rows = opened.db.select().from(schema.childPhoto).all();
		expect(rows.map((r) => r.ownerId)).toEqual([mia]);
	});

	it('stores chore and reward photos, deleted with their owner', () => {
		const [chore] = opened.db
			.insert(schema.chore)
			.values({ familyId: ours.familyId, name: 'Water', icon: 'paw', stars: 10 })
			.returning()
			.all();
		const [reward] = opened.db
			.insert(schema.reward)
			.values({ familyId: ours.familyId, name: 'Pool', cost: 50 })
			.returning()
			.all();
		const start = familyVersion(ours);
		expect(savePhoto(ours, 'chore', chore.id, data, 5)).toBe(true);
		expect(savePhoto(ours, 'reward', reward.id, data, 6)).toBe(true);
		expect(familyVersion(ours)).toBeGreaterThan(start);
		expect(listChores(ours)[0].photo).toBe(`/api/photos/chore/${chore.id}?v=5`);
		expect(listRewards(ours)[0].photo).toBe(`/api/photos/reward/${reward.id}?v=6`);
		expect(savePhoto(theirs, 'chore', chore.id, data)).toBe(false);
		expect(readPhoto(theirs, 'reward', reward.id)).toBeNull();
		expect(photoUrls(theirs, 'chore').size).toBe(0);
		removeChore(ours, chore.id);
		removeReward(ours, reward.id);
		expect(opened.db.select().from(schema.chorePhoto).all()).toEqual([]);
		expect(opened.db.select().from(schema.rewardPhoto).all()).toEqual([]);
	});

	it('never reaches another family’s child', () => {
		savePhoto(ours, 'child', mia, data);
		expect(readPhoto(theirs, 'child', mia)).toBeNull();
		expect(photoUrl(theirs, 'child', mia)).toBeNull();
		expect(savePhoto(theirs, 'child', mia, Buffer.from('x'))).toBe(false);
		expect(removePhoto(theirs, 'child', mia)).toBe(false);
		expect(readPhoto(ours, 'child', mia)?.data.toString()).toBe('photo-bytes');
	});
});
