// Fills the local R2 bucket from a fixture. Never touches the production bucket.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const OBJECT = 'dss/sekolah-seller_end-user/terbaru.json';
const scenario = process.argv[2] ?? 'terbaru';

const args =
	scenario === 'hapus'
		? ['r2', 'object', 'delete', OBJECT, '--local']
		: [
				'r2',
				'object',
				'put',
				OBJECT,
				'--file',
				`fixtures/${scenario}.json`,
				'--content-type',
				'application/json',
				'--local',
			];

if (scenario !== 'hapus' && !existsSync(`fixtures/${scenario}.json`)) {
	console.error(`Skenario tidak dikenal: ${scenario}`);
	process.exit(1);
}

execFileSync('npx', ['wrangler', ...args], { stdio: 'inherit' });
