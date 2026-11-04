interface Env {
	LEADERBOARD_BUCKET: R2Bucket;
}

const LEADERBOARDS = new Set(['sekolah-seller_end-user']);
const KEY_PATTERN = /^(terbaru|index|\d{4}-\d{2})$/;

function errorResponse(error: string, status: number) {
	return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function cacheControl(key: string, body: string) {
	if (key === 'terbaru') return 'public, max-age=60';
	if (key === 'index') return 'public, max-age=300';
	try {
		return JSON.parse(body).final === true ? 'public, max-age=86400' : 'public, max-age=60';
	} catch {
		return 'public, max-age=60';
	}
}

export const onRequestGet: PagesFunction<Env, 'leaderboard' | 'key'> = async ({
	request,
	env,
	params,
	waitUntil,
}) => {
	const { leaderboard, key } = params;
	if (
		typeof leaderboard !== 'string' ||
		typeof key !== 'string' ||
		!LEADERBOARDS.has(leaderboard) ||
		!KEY_PATTERN.test(key)
	) {
		return errorResponse('not_found', 404);
	}

	try {
		// Query strings are dropped so they cannot be used to bypass the cache.
		const url = new URL(request.url);
		url.search = '';
		const cacheKey = new Request(url.toString());

		const cached = await caches.default.match(cacheKey);
		if (cached) return cached;

		const object = await env.LEADERBOARD_BUCKET.get(`${leaderboard}/${key}.json`);
		if (!object) return errorResponse('not_found', 404);

		const body = await object.text();
		const response = new Response(body, {
			headers: { 'Content-Type': 'application/json', 'Cache-Control': cacheControl(key, body) },
		});
		waitUntil(caches.default.put(cacheKey, response.clone()));
		return response;
	} catch (error) {
		console.error('Failed to read leaderboard snapshot', error);
		return errorResponse('upstream_error', 502);
	}
};
