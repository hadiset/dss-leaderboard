// Fills the local R2 bucket from a fixture. Never touches the production bucket.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const FOLDER = 'dss/sekolah-seller_end-user';
const scenario = process.argv[2] ?? 'terbaru';

function wrangler(...args) {
	execFileSync('npx', ['wrangler', 'r2', 'object', ...args, '--local'], { stdio: 'inherit' });
}

function put(object, fixture) {
	wrangler(
		'put',
		`${FOLDER}/${object}.json`,
		'--file',
		`fixtures/${fixture}.json`,
		'--content-type',
		'application/json',
	);
}

if (scenario === 'hapus') {
	wrangler('delete', `${FOLDER}/terbaru.json`);
} else if (scenario === 'arsip') {
	put('index', 'index');
	put('2026-11', 'terbaru');
	put('2026-10', '2026-10');
} else if (existsSync(`fixtures/${scenario}.json`)) {
	put('terbaru', scenario);
} else {
	console.error(`Skenario tidak dikenal: ${scenario}`);
	process.exit(1);
}
