const TIME_ZONE = 'Asia/Jakarta';

const nominal = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const tanggal = new Intl.DateTimeFormat('id-ID', {
	weekday: 'long',
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	timeZone: TIME_ZONE,
});
const jam = new Intl.DateTimeFormat('id-ID', {
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
	timeZone: TIME_ZONE,
});
const bulan = new Intl.DateTimeFormat('id-ID', {
	month: 'long',
	year: 'numeric',
	timeZone: 'UTC',
});

export function formatRupiah(nilai: number): string {
	return `${nilai < 0 ? '-' : ''}Rp${nominal.format(Math.abs(nilai))}`;
}

export function formatPeriode(key: string): string {
	const [tahun, nomorBulan] = key.split('-').map(Number);
	return bulan.format(new Date(Date.UTC(tahun, nomorBulan - 1, 1)));
}

export function formatDiperbarui(iso: string): string {
	const waktu = new Date(iso);
	return `${tanggal.format(waktu)} · ${jam.format(waktu)} WIB`;
}
