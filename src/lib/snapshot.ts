const SCHEMA_VERSION = 1;
const USANG_MS = 48 * 60 * 60 * 1000;
export const REFRESH_MS = 5 * 60 * 1000;

export interface Entri {
	rank: number;
	nama: string;
	/** Masked by OMS, such as "5.6xx.xxx". Plain numbers are still accepted. */
	nilai_bersih: number | string;
}

export interface Snapshot {
	schema_version: number;
	platform: string;
	tier: string;
	periode: { key: string };
	final: boolean;
	diperbarui: string;
	data: Entri[];
}

interface PeriodeMentah {
	key?: string;
	bulan?: string;
}

function isEntri(value: unknown): value is Entri {
	const entri = value as Entri | null;
	return (
		typeof entri?.rank === 'number' &&
		typeof entri.nama === 'string' &&
		['number', 'string'].includes(typeof entri.nilai_bersih)
	);
}

/** Returns null when the payload is not a snapshot this page understands. */
export function parseSnapshot(value: unknown): Snapshot | null {
	const snapshot = value as (Omit<Snapshot, 'periode'> & { periode?: PeriodeMentah }) | null;
	// periode.key is the older name for periode.bulan.
	const key = snapshot?.periode?.key ?? snapshot?.periode?.bulan;
	const valid =
		snapshot?.schema_version === SCHEMA_VERSION &&
		typeof snapshot.platform === 'string' &&
		typeof snapshot.tier === 'string' &&
		/^\d{4}-\d{2}$/.test(key ?? '') &&
		typeof snapshot.final === 'boolean' &&
		!Number.isNaN(Date.parse(snapshot.diperbarui)) &&
		Array.isArray(snapshot.data) &&
		snapshot.data.every(isEntri);
	return valid ? { ...snapshot, periode: { key: key as string } } : null;
}

export function isUsang(diperbarui: string, now: number): boolean {
	return now - Date.parse(diperbarui) > USANG_MS;
}

export function filterEntri(data: Entri[], query: string): Entri[] {
	const kata = query.trim().toLocaleLowerCase('id-ID');
	return data.filter((entri) => entri.nama.toLocaleLowerCase('id-ID').includes(kata));
}

/** Tied entries at rank 3 all become cards, so nobody is demoted by name order. */
export function splitTop(data: Entri[]): { top: Entri[]; rest: Entri[] } {
	return {
		top: data.filter((entri) => entri.rank <= 3),
		rest: data.filter((entri) => entri.rank > 3),
	};
}

export function shouldRefresh(visible: boolean, lastFetch: number, now: number): boolean {
	return visible && now - lastFetch >= REFRESH_MS;
}
