import { describe, expect, it } from 'vitest';
import terbaru from '../fixtures/terbaru.json';
import {
	REFRESH_MS,
	filterEntri,
	isUsang,
	parseIndex,
	parseSnapshot,
	periodeDariUrl,
	sepuluhBesar,
	shouldRefresh,
	splitTop,
} from '../src/lib/snapshot';

describe('parseSnapshot', () => {
	it('accepts the production shape and exposes periode.key', () => {
		const snapshot = parseSnapshot(terbaru);

		expect(snapshot?.periode.key).toBe('2026-11');
		expect(snapshot?.data).toEqual(terbaru.data);
	});

	it('still accepts the older key and numeric shape', () => {
		const snapshot = parseSnapshot({
			...terbaru,
			periode: { key: '2026-11' },
			data: [{ rank: 1, nama: 'Seller A', nilai_bersih: 5155000 }],
		});

		expect(snapshot?.periode.key).toBe('2026-11');
		expect(snapshot?.data[0].nilai_bersih).toBe(5155000);
	});

	it.each([
		['unknown schema', { ...terbaru, schema_version: 99 }],
		['missing data', { ...terbaru, data: undefined }],
		['bad entry', { ...terbaru, data: [{ rank: 1 }] }],
		['bad date', { ...terbaru, diperbarui: 'kemarin' }],
		['bad period', { ...terbaru, periode: {} }],
		['null', null],
	])('rejects %s', (_, value) => {
		expect(parseSnapshot(value)).toBeNull();
	});
});

describe('parseIndex', () => {
	it('accepts the production shape', () => {
		expect(parseIndex({ schema_version: 1, periode: ['2026-11', '2026-10'] })).toEqual([
			'2026-11',
			'2026-10',
		]);
	});

	it.each([
		['unknown schema', { schema_version: 99, periode: ['2026-11'] }],
		['objects instead of keys', { schema_version: 1, periode: [{ key: '2026-11' }] }],
		['missing list', { schema_version: 1 }],
		['null', null],
	])('rejects %s', (_, value) => {
		expect(parseIndex(value)).toBeNull();
	});
});

describe('periodeDariUrl', () => {
	it('reads a valid period', () => {
		expect(periodeDariUrl('?periode=2026-10')).toBe('2026-10');
	});

	it.each(['', '?periode=', '?periode=index', '?periode=../index', '?periode=2026-1'])(
		'ignores %s',
		(search) => {
			expect(periodeDariUrl(search)).toBeNull();
		},
	);
});

describe('splitTop', () => {
	it('keeps rank 3 ties together and leaves ranks untouched', () => {
		const { top, rest } = splitTop(terbaru.data);

		expect(top.map((entri) => entri.rank)).toEqual([1, 2, 3, 3]);
		expect(rest[0].rank).toBe(5);
	});
});

describe('sepuluhBesar', () => {
	it('stops at rank 10', () => {
		expect(sepuluhBesar(terbaru.data).map((entri) => entri.rank)).toEqual([
			1, 2, 3, 3, 5, 6, 7, 7, 9, 10,
		]);
	});

	it('keeps ties at rank 10', () => {
		const data = [10, 10, 12].map((rank) => ({ rank, nama: 'Seller', nilai_bersih: '1xx.xxx' }));

		expect(sepuluhBesar(data).map((entri) => entri.rank)).toEqual([10, 10]);
	});
});

describe('filterEntri', () => {
	it('matches case-insensitively and keeps the original rank', () => {
		expect(filterEntri(terbaru.data, '  seller d ')).toEqual([
			{ rank: 3, nama: 'Seller D', nilai_bersih: '1xx.xxx' },
		]);
	});

	it('returns everything for an empty query', () => {
		expect(filterEntri(terbaru.data, '')).toHaveLength(terbaru.data.length);
	});
});

describe('isUsang', () => {
	const diperbarui = '2026-11-04T11:00:00+07:00';
	const base = Date.parse(diperbarui);
	const jam = 60 * 60 * 1000;

	it('turns true only after 48 hours', () => {
		expect(isUsang(diperbarui, base + 48 * jam)).toBe(false);
		expect(isUsang(diperbarui, base + 48 * jam + 1)).toBe(true);
	});
});

describe('shouldRefresh', () => {
	it('waits for the interval', () => {
		expect(shouldRefresh(true, 1000, 1000 + REFRESH_MS - 1)).toBe(false);
		expect(shouldRefresh(true, 1000, 1000 + REFRESH_MS)).toBe(true);
	});

	it('never refreshes a hidden tab', () => {
		expect(shouldRefresh(false, 0, 10 * REFRESH_MS)).toBe(false);
	});
});
