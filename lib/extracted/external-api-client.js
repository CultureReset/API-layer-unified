// EXTRACTED FROM: gcr-api-clean/lib/composioClient.js — a well-shaped
// external-API wrapper independent of whether the Composio integration
// itself works (that integration is confirmed broken per that repo's own
// HANDOFF.md; this is the surrounding client shape, not the Composio
// specifics).
//
// WHAT IT DOES: readable errors that never echo the API key back into a
// log or response, a cursor-pagination helper, and a BOUNDED-pagination
// variant specifically so a paginated third-party API can't make a
// serverless function run past its timeout fetching page after page.
//
// STATUS: standalone, generic — usable for any future third-party API
// client (a real Composio client, a future payments/SMS provider client).
// Not wired to any specific vendor.

function createApiClient({ baseUrl, apiKey, headerName = 'Authorization' }) {
  async function request(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { [headerName]: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      // Never echo the key — a naive error message templated from `options`
      // or the raw request would leak it into logs.
      throw new Error(`Request to ${path} failed (${res.status}): ${body.slice(0, 300)}`);
    }
    return res.json();
  }

  // Follows every page until the API stops returning a cursor.
  async function fetchAllPages(path, { cursorParam = 'cursor', cursorField = 'next_cursor' } = {}) {
    let cursor = null;
    const all = [];
    do {
      const url = cursor ? `${path}${path.includes('?') ? '&' : '?'}${cursorParam}=${cursor}` : path;
      const page = await request(url);
      all.push(...(page.items || page.data || []));
      cursor = page[cursorField] || null;
    } while (cursor);
    return all;
  }

  // Fetches at most `maxPages` — for a serverless environment where
  // following every page of an unbounded third-party list could exceed the
  // function's own timeout.
  async function fetchBoundedPages(path, { cursorParam = 'cursor', cursorField = 'next_cursor', maxPages = 5 } = {}) {
    let cursor = null;
    const all = [];
    for (let i = 0; i < maxPages; i++) {
      const url = cursor ? `${path}${path.includes('?') ? '&' : '?'}${cursorParam}=${cursor}` : path;
      const page = await request(url);
      all.push(...(page.items || page.data || []));
      cursor = page[cursorField] || null;
      if (!cursor) break;
    }
    return { items: all, truncated: Boolean(cursor) };
  }

  return { request, fetchAllPages, fetchBoundedPages };
}

module.exports = { createApiClient };
