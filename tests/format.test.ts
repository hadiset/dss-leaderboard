import { describe, expect, it } from 'vitest';
import { formatDiperbarui, formatPeriode, formatRupiah, formatTier } from '../src/lib/format';

describe('formatTier', () => {
	it('shows End User as Dropship and leaves other tiers alone', () => {
		expect(formatTier('End User')).toBe('Dropship');
		expect(formatTier('Reseller')).toBe('Reseller');
	});
});

describe('formatRupiah', () => {
	it('formats without a space or decimals', () => {
		expect(formatRupiah(5155000)).toBe('Rp5.155.000');
		expect(formatRupiah(0)).toBe('Rp0');
	});

	it('keeps the sign for net returns', () => {
		expect(formatRupiah(-75000)).toBe('-Rp75.000');
		expect(formatRupiah('-7x.xxx')).toBe('-Rp7x.xxx');
	});

	it('shows masked values from OMS as they are', () => {
		expect(formatRupiah('5.6xx.xxx')).toBe('Rp5.6xx.xxx');
	});
});

describe('formatPeriode', () => {
	it('labels the month in Indonesian', () => {
		expect(formatPeriode('2026-11')).toBe('November 2026');
		expect(formatPeriode('2026-01')).toBe('Januari 2026');
	});
});

describe('formatDiperbarui', () => {
	it('shows WIB time', () => {
		expect(formatDiperbarui('2026-11-04T11:00:02+07:00')).toBe('Rabu, 4 Nov 2026 · 11.00 WIB');
	});

	it('converts other offsets to Asia/Jakarta, including across midnight', () => {
		expect(formatDiperbarui('2026-11-04T18:30:00Z')).toBe('Kamis, 5 Nov 2026 · 01.30 WIB');
	});
});
