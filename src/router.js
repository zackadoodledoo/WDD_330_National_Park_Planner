// router.js

export function parseRoute() {
    const hash = window.location.hash || "#/";
    const [path, queryString] = hash.slice(1).split("?");
    const params = new URLSearchParams(queryString || "");
    return { path: path || "/", params };
}