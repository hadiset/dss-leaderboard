import { beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequestGet } from '../functions/api/[leaderboard]/[key]';

const BODY = '{"schema_version":1}';
const store = new Map<string, Response>();
const get = vi.fn();

function call(leaderboard: string, key: string, query = '') {
	const pending: Promise<unknown>[] = [];
	const context = {
		request: new Request(`https://example.com/api/${leaderboard}/${key}${query}`),
		env: { LEADERBOARD_BUCKET: { get } },
		params: { leaderboard, key },
		waitUntil: (promise: Promise<unknown>) => pending.push(promise),
	};
	return (onRequestGet as unknown as (c: typeof context) => Promise<Response>)(context).then(
		async (response) => {
			await Promise.all(pending);
			return response;
		},
	);
}

beforeEach(() => {
	store.clear();
	get.mockReset();
	get.mockImplementation(async () => ({ body: BODY }));
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.stubGlobal('caches', {
		default: {
			match: async (request: Request) => store.get(request.url)?.clone(),
			put: async (request: Request, response: Response) => void store.set(request.url, response),
		},
	});
});

describe('GET /api/:leaderboard/:key', () => {
	it('serves the snapshot with cache headers', async () => {
		const response = await call('sekolah-seller_end-user', 'terbaru');

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('application/json');
		expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
		expect(await response.text()).toBe(BODY);
		expect(get).toHaveBeenCalledWith('sekolah-seller_end-user/terbaru.json');
	});

	it('reads R2 once for repeated requests, even with a different query', async () => {
		await call('sekolah-seller_end-user', 'terbaru');
		const second = await call('sekolah-seller_end-user', 'terbaru', '?x=1');

		expect(await second.text()).toBe(BODY);
		expect(get).toHaveBeenCalledTimes(1);
	});

	it.each([
		['sekolah-seller_end-user', 'index'],
		['sekolah-seller_end-user', '2026-11'],
		['sekolah-seller_end-user', '..'],
		['sekolah-seller_end-user', '../index'],
		['lain', 'terbaru'],
		['constructor', 'terbaru'],
	])('returns 404 without reading R2 for %s/%s', async (leaderboard, key) => {
		const response = await call(leaderboard, key);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: 'not_found' });
		expect(get).not.toHaveBeenCalled();
	});

	it('returns 404 when the object is missing and does not cache it', async () => {
		get.mockResolvedValue(null);
		const response = await call('sekolah-seller_end-user', 'terbaru');

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: 'not_found' });
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		expect(store.size).toBe(0);
	});

	it('returns 502 without internal details when R2 fails', async () => {
		get.mockRejectedValue(new Error('secret bucket detail'));
		const response = await call('sekolah-seller_end-user', 'terbaru');

		expect(response.status).toBe(502);
		expect(await response.text()).not.toContain('secret');
	});
});
