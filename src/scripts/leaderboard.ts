import { formatDiperbarui, formatPeriode, formatRupiah, formatTier } from '../lib/format';
import {
	filterEntri,
	isUsang,
	parseIndex,
	parseSnapshot,
	periodeDariUrl,
	sepuluhBesar,
	shouldRefresh,
	splitTop,
	type Entri,
	type Snapshot,
} from '../lib/snapshot';

const API_BASE = '/api/sekolah-seller_end-user';
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
const pilihPeriode = byId('pilih-periode');
const pilihan = byId<HTMLSelectElement>('pilihan-periode');
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
let aktif = periodeDariUrl(location.search) ?? 'terbaru';
let percobaan = aktif;
let lastFetch = 0;
let permintaan: AbortController | null = null;

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
	const hasil = filterEntri(sepuluhBesar(data), cari.value);
	const { top, rest } = splitTop(hasil);
	top3.replaceChildren(...top.map((entri) => buatEntri(templateKartu, entri)));
	daftar.replaceChildren(...rest.map((entri) => buatEntri(templateBaris, entri)));
	top3.hidden = top.length === 0;
	tabel.hidden = rest.length === 0;
	tanpaHasil.hidden = hasil.length > 0;
}

function render(data: Snapshot) {
	judul.textContent = `${data.platform} · ${formatTier(data.tier)}`;
	periode.textContent = formatPeriode(data.periode.key);
	pilihan.value = data.periode.key;
	diperbarui.textContent = `Diperbarui ${formatDiperbarui(data.diperbarui)}`;
	sementara.hidden = data.final;
	keterangan.hidden = data.final;
	usang.hidden = data.final || !isUsang(data.diperbarui, Date.now());
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

async function load(key: string, catatRiwayat = false) {
	permintaan?.abort();
	const controller = new AbortController();
	permintaan = controller;
	percobaan = key;
	lastFetch = Date.now();
	cobaLagi.disabled = true;
	if (!snapshot) {
		pesan.hidden = true;
		skeleton.hidden = false;
	}

	try {
		const response = await fetch(`${API_BASE}/${key}`, {
			signal: AbortSignal.any([controller.signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)]),
		});
		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const body: unknown = await response.json().catch(() => null);
		if (controller.signal.aborted) return;

		const parsed = parseSnapshot(body);
		if (parsed) {
			aktif = key;
			snapshot = parsed;
			pesan.hidden = true;
			render(parsed);
			if (catatRiwayat) history.pushState(null, '', `?periode=${key}`);
		} else {
			tampilkanPesan(PESAN_FORMAT, false);
		}
	} catch {
		// Whatever is already on screen stays there.
		if (!controller.signal.aborted) tampilkanPesan(PESAN_GAGAL, true);
	} finally {
		if (permintaan === controller) {
			permintaan = null;
			cobaLagi.disabled = false;
			skeleton.hidden = true;
			// A failed switch must not leave the selector naming a period that is not shown.
			if (snapshot) pilihan.value = snapshot.periode.key;
		}
	}
}

async function loadIndex() {
	try {
		const response = await fetch(`${API_BASE}/index`, {
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});
		const periodeTersedia = response.ok ? parseIndex(await response.json()) : null;
		if (!periodeTersedia || periodeTersedia.length < 2) return;

		pilihan.replaceChildren(...periodeTersedia.map((key) => new Option(formatPeriode(key), key)));
		if (snapshot) pilihan.value = snapshot.periode.key;
		pilihPeriode.hidden = false;
	} catch {
		// The page works without the selector.
	}
}

function refreshIfDue() {
	if (permintaan || snapshot?.final) return;
	if (shouldRefresh(document.visibilityState === 'visible', lastFetch, Date.now())) {
		void load(aktif);
	}
}

cari.addEventListener('input', () => {
	if (snapshot) renderEntri(snapshot.data);
});
pilihan.addEventListener('change', () => void load(pilihan.value, true));
cobaLagi.addEventListener('click', () => void load(percobaan, percobaan !== aktif));
window.addEventListener('popstate', () => void load(periodeDariUrl(location.search) ?? 'terbaru'));
document.addEventListener('visibilitychange', refreshIfDue);
setInterval(refreshIfDue, REFRESH_CHECK_MS);

void load(aktif);
void loadIndex();
