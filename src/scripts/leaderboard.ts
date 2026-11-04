import { formatDiperbarui, formatPeriode, formatRupiah } from '../lib/format';
import {
	filterEntri,
	isUsang,
	parseSnapshot,
	shouldRefresh,
	splitTop,
	type Entri,
	type Snapshot,
} from '../lib/snapshot';

const API_URL = '/api/sekolah-seller_end-user/terbaru';
const FETCH_TIMEOUT_MS = 10_000;
const REFRESH_CHECK_MS = 30_000;

const PESAN_GAGAL = 'Data belum bisa dimuat. Periksa koneksi lalu coba lagi.';
const PESAN_FORMAT = 'Format data tidak dikenali';

function byId<T extends HTMLElement>(id: string): T {
	return document.getElementById(id) as T;
}

const judul = byId('judul');
const periode = byId('periode');
const diperbarui = byId('diperbarui');
const sementara = byId('sementara');
const keterangan = byId('keterangan');
const usang = byId('usang');
const pesan = byId('pesan');
const pesanTeks = byId('pesan-teks');
const cobaLagi = byId<HTMLButtonElement>('coba-lagi');
const skeleton = byId('skeleton');
const konten = byId('konten');
const kosong = byId('kosong');
const cari = byId<HTMLInputElement>('cari');
const pencarian = byId('pencarian');
const tanpaHasil = byId('tanpa-hasil');
const top3 = byId('top3');
const tabel = byId('tabel');
const daftar = byId('daftar');
const templateKartu = byId<HTMLTemplateElement>('template-kartu');
const templateBaris = byId<HTMLTemplateElement>('template-baris');

let snapshot: Snapshot | null = null;
let lastFetch = 0;
let loading = false;

function buatEntri(template: HTMLTemplateElement, entri: Entri): HTMLElement {
	const node = (template.content.cloneNode(true) as DocumentFragment)
		.firstElementChild as HTMLElement;
	node.dataset.rank = String(entri.rank);
	// textContent, not innerHTML: names come from data.
	(node.querySelector('[data-field="rank"]') as HTMLElement).textContent = String(entri.rank);
	(node.querySelector('[data-field="nama"]') as HTMLElement).textContent = entri.nama;
	(node.querySelector('[data-field="nilai"]') as HTMLElement).textContent = formatRupiah(
		entri.nilai_bersih,
	);
	return node;
}

function renderEntri(data: Entri[]) {
	const hasil = filterEntri(data, cari.value);
	const { top, rest } = splitTop(hasil);
	top3.replaceChildren(...top.map((entri) => buatEntri(templateKartu, entri)));
	daftar.replaceChildren(...rest.map((entri) => buatEntri(templateBaris, entri)));
	top3.hidden = top.length === 0;
	tabel.hidden = rest.length === 0;
	tanpaHasil.hidden = hasil.length > 0;
}

function render(data: Snapshot) {
	judul.textContent = `${data.platform} · ${data.tier}`;
	periode.textContent = formatPeriode(data.periode.key);
	diperbarui.textContent = `Diperbarui ${formatDiperbarui(data.diperbarui)}`;
	sementara.hidden = data.final;
	keterangan.hidden = data.final;
	usang.hidden = !isUsang(data.diperbarui, Date.now());
	usang.textContent = `Belum ada pembaruan sejak ${formatDiperbarui(data.diperbarui)}`;

	const adaData = data.data.length > 0;
	kosong.hidden = adaData;
	pencarian.hidden = !adaData;
	konten.hidden = !adaData;
	if (adaData) renderEntri(data.data);
}

function tampilkanPesan(teks: string, bisaDicoba: boolean) {
	pesanTeks.textContent = teks;
	cobaLagi.hidden = !bisaDicoba;
	pesan.hidden = false;
}

async function load() {
	if (loading) return;
	loading = true;
	lastFetch = Date.now();
	cobaLagi.disabled = true;
	if (!snapshot) {
		pesan.hidden = true;
		skeleton.hidden = false;
	}

	try {
		const response = await fetch(API_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const body: unknown = await response.json().catch(() => null);
		const parsed = parseSnapshot(body);
		if (parsed) {
			snapshot = parsed;
			pesan.hidden = true;
			render(parsed);
		} else {
			tampilkanPesan(PESAN_FORMAT, false);
		}
	} catch {
		// Whatever is already on screen stays there.
		tampilkanPesan(PESAN_GAGAL, true);
	} finally {
		loading = false;
		cobaLagi.disabled = false;
		skeleton.hidden = true;
	}
}

function refreshIfDue() {
	if (shouldRefresh(document.visibilityState === 'visible', lastFetch, Date.now())) void load();
}

cari.addEventListener('input', () => {
	if (snapshot) renderEntri(snapshot.data);
});
cobaLagi.addEventListener('click', () => void load());
document.addEventListener('visibilitychange', refreshIfDue);
setInterval(refreshIfDue, REFRESH_CHECK_MS);

void load();
