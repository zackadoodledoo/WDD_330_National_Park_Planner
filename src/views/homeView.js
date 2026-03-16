import { CONFIG } from "../config.js";
import { searchParks } from "../api/parks.js";

export async function renderHome(root) {
  root.innerHTML = `
    <section class="panel">
      <h1>Discover Your Next Adventure</h1>

      <form id="searchForm" class="search">
        <input
          name="q"
          placeholder="Search parks (Zion, canyon, redwoods...)"
        />

        <select name="stateCode">
          <option value="">Any state</option>
          <option value="CA">California</option>
          <option value="UT">Utah</option>
          <option value="AZ">Arizona</option>
          <option value="WA">Washington</option>
        </select>

        <button class="btn">Search</button>
      </form>

      <div id="meta" class="meta"></div>
      <div id="results" class="grid"></div>
    </section>
  `;

  const form = root.querySelector("#searchForm");
  const meta = root.querySelector("#meta");
  const results = root.querySelector("#results");

  async function runSearch({ q, stateCode }) {
    meta.textContent = "Searching parks...";
    results.innerHTML = "";

    const data = await searchParks({
      apiKey: CONFIG.NPS_API_KEY,
      q,
      stateCode,
      limit: 12,
    });

    const parks = data?.data || [];
    meta.textContent = `Showing ${parks.length} parks`;

    results.innerHTML = parks
      .map((park) => {
        const img = park.images?.[0]?.url || "";
        return `
          <article class="card">
            ${
              img
                ? `<img src="${img}" alt="${park.fullName}" />`
                : `<div class="img-placeholder"></div>`
            }
            <div class="card-body">
              <h3>${park.fullName}</h3>
              <p>${park.description?.slice(0, 120) || ""}...</p>
              <a class="btn" href="#/park?code=${park.parkCode}">
                View Details
              </a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);

    runSearch({
      q: fd.get("q")?.toString().trim(),
      stateCode: fd.get("stateCode")?.toString(),
    });
  });

  // Initial load
  await runSearch({ q: "national park", stateCode: "" });
}
