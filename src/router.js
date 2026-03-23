export function parseRoute() {
  // location.hash like "#/park?code=abli" or "" -> "/"
  const raw = (location.hash || "#/").slice(1); // remove leading '#'
  const [pathPart, queryString] = raw.split("?");
  const path = pathPart || "/";
  const params = {};

  if (queryString) {
    const sp = new URLSearchParams(queryString);
    for (const [k, v] of sp.entries()) params[k] = v;
  }

  return { path, params };
}
