import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const halaman = readFileSync('src/pages/index.astro', 'utf8');
const script = readFileSync('src/scripts/leaderboard.ts', 'utf8');

describe('index.astro', () => {
	const ids = [...script.matchAll(/byId(?:<\w+>)?\('([\w-]+)'\)/g)].map((match) => match[1]);

	it('finds the ids in the script', () => {
		expect(ids.length).toBeGreaterThan(10);
	});

	it.each(ids)('has an element with id %s', (id) => {
		expect(halaman).toContain(`id="${id}"`);
	});
});
