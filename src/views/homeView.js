import { CONFIG } from "../config.js";
import { searchParks } from "../api/parks.js";
import { distanceMiles, getCurrentPosition, geocodeAddress } from "../utils/geo.js";

export async function renderHome(root) {
  root.innerHTML = `
    <section class="panel">
      <h1>Discover Your Next Adventure</h1>

      <form id="searchForm" class="search">
        <input name="q" placeholder="Search parks (Zion, canyon, redwoods...)" />

        <select name="stateCode">
          <option value="">Any state</option>
          <option value="CA">California</option>
          <option value="UT">Utah</option>
          <option value="AZ">Arizona</option>
          <option value="WA">Washington</option>
        </select>

        <div style="display:flex;gap:8px;align-items:center;">
          <input id="locationInput" name="location" placeholder="Enter city or address" />
          <button id="useMyLocation" class="btn" type="button">Use my location</button>
        </div>

        <div style="display:flex;gap:8px;align-items:center;">
          <input id="maxMiles" name="maxMiles" type="number" min="1" placeholder="Max miles (optional)" style="width:140px;padding:10px;border-radius:10px;border:1px solid var(--border)" />
          <button class="btn" type="submit">Search</button>
        </div>
      </form>

      <div id="meta" class="meta"></div>
      <div id="results" class="grid"></div>
    </section>
  `;

  const form = root.querySelector("#searchForm");
  const meta = root.querySelector("#meta");
  const results = root.querySelector("#results");
  const locationInput = root.querySelector("#locationInput");
  const useMyLocationBtn = root.querySelector("#useMyLocation");
  const maxMilesInput = root.querySelector("#maxMiles");

  // Keep a cached user location { lat, lon } or null
  let userLocation = null;

  // Helper to render parks with optional distance filtering/sorting
  function renderParks(parks) {
    // compute distance for each park if we have userLocation and park lat/lon
    const parksWithDistance = parks.map((park) => {
      const lat = Number(park.latitude || park.lat || 0);
      const lon = Number(park.longitude || park.lon || 0);
      let dist = null;
      if (userLocation && lat && lon) {
        dist = distanceMiles(userLocation.lat, userLocation.lon, lat, lon);
      }
      return { park, dist };
    });

    // Apply max miles filter if provided
    const maxMiles = Number(maxMilesInput.value) || null;
    let filtered = parksWithDistance;
    if (maxMiles && !Number.isNaN(maxMiles)) {
      filtered = filtered.filter((p) => p.dist !== null && p.dist <= maxMiles);
    }

    // Sort by distance if we have a user location, otherwise keep original order
    if (userLocation) {
      filtered.sort((a, b) => {
        if (a.dist === null) return 1;
        if (b.dist === null) return -1;
        return a.dist - b.dist;
      });
    }

    // Render cards
    results.innerHTML = filtered
      .map(({ park, dist }) => {
        const img = park.images?.[0]?.url || "";
        const distanceHtml = dist !== null ? `<div class="distance-badge">${Math.round(dist)} mi</div>` : "";
        return `
          <article class="card">
            ${img ? `<img src="${img}" alt="${park.fullName}" />` : `<div class="img-placeholder"></div>`}
            <div class="card-body">
              <div style="display:flex;justify-content:space-between;align-items:start;">
                <h3>${park.fullName}</h3>
                ${distanceHtml}
              </div>
              <p>${park.description?.slice(0, 120) || ""}...</p>
              <a class="btn" href="#/park?code=${encodeURIComponent(park.parkCode)}">View Details</a>
            </div>
          </article>
        `;
      })
      .join("");

    meta.textContent = `Showing ${filtered.length} parks`;
  }

  async function runSearch({ q, stateCode }) {
    meta.textContent = "Searching parks...";
    results.innerHTML = "";

    try {
      const data = await searchParks({
        apiKey: CONFIG.NPS_API_KEY,
        q,
        stateCode,
        limit: 50, // increase limit so filtering by distance has more results
      });

      console.log("NPS response", data);
      const parks = data?.data || [];
      if (!parks.length) {
        results.innerHTML = `<div class="muted">No parks found. Try a different search.</div>`;
        meta.textContent = "";
        return;
      }

      renderParks(parks);
    } catch (err) {
      console.error("Search failed", err);
      meta.textContent = "";
      results.innerHTML = `<div class="muted">Error loading parks: ${err.message}</div>`;
    }
  }

  // Use browser geolocation
  useMyLocationBtn.addEventListener("click", async () => {
    useMyLocationBtn.textContent = "Locating...";
    useMyLocationBtn.disabled = true;
    try {
      const pos = await getCurrentPosition();
      userLocation = pos;
      locationInput.value = ""; // clear typed location
      useMyLocationBtn.textContent = "Use my location";
      useMyLocationBtn.disabled = false;
      meta.textContent = `Location set (${userLocation.lat.toFixed(3)}, ${userLocation.lon.toFixed(3)})`;
      // Re-run last search if any (submit form programmatically)
      const fd = new FormData(form);
      await runSearch({ q: fd.get("q")?.toString().trim(), stateCode: fd.get("stateCode")?.toString() });
    } catch (err) {
      console.error("Geolocation failed", err);
      useMyLocationBtn.textContent = "Use my location";
      useMyLocationBtn.disabled = false;
      meta.textContent = `Could not get location: ${err.message || err}`;
    }
  });

  // If user types an address and submits, geocode it
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const q = fd.get("q")?.toString().trim();
    const stateCode = fd.get("stateCode")?.toString();
    const typedLocation = fd.get("location")?.toString().trim();

    // If typed location provided, geocode it
    if (typedLocation) {
      meta.textContent = "Resolving location...";
      try {
        const pos = await geocodeAddress(typedLocation);
        userLocation = pos;
        meta.textContent = `Location set (${userLocation.lat.toFixed(3)}, ${userLocation.lon.toFixed(3)})`;
      } catch (err) {
        console.error("Geocode failed", err);
        meta.textContent = `Location not found: ${err.message || err}`;
        userLocation = null;
      }
    }

    await runSearch({ q, stateCode });
  });

  // Initial load
  await runSearch({ q: "national park", stateCode: "" });
}
