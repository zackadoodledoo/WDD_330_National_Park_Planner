const BASE = "https://developer.nps.gov/api/v1";

export async function searchParks({
  apiKey,
  q = "",
  stateCode = "",
  limit = 12,
  start = 0,
}) {
  const url = new URL(`${BASE}/parks`);
  if (q) url.searchParams.set("q", q);
  if (stateCode) url.searchParams.set("stateCode", stateCode);
  url.searchParams.set("limit", limit);
  url.searchParams.set("start", start);

  const res = await fetch(url.toString(), {
    headers: { "X-Api-Key": apiKey },
  });

  if (!res.ok) throw new Error(`NPS error: ${res.status}`);
  return res.json();
}

export async function getParkByCode({ apiKey, parkCode }) {
  const url = new URL(`${BASE}/parks`);
  url.searchParams.set("parkCode", parkCode);

  const res = await fetch(url.toString(), {
    headers: { "X-Api-Key": apiKey },
  });

  if (!res.ok) throw new Error(`NPS error: ${res.status}`);
  const data = await res.json();
  return data?.data?.[0];
}
