import { CONFIG } from "../config.js";
import { getParkByCode } from "../api/parks.js";
import { parseRoute } from "../router.js";

export async function renderDetail(root, params) {
    const route = parseRoute();
  const parkCode = params?.code;
  root.innerHTML = `
    <section class="panel">
      <div id="detail-loading" class="meta">Loading park...</div>
      <div id="detail-error" class="muted" style="display:none;"></div>
      <div id="park-detail" style="display:none;"></div>
    </section>
  `;

  const loadingEl = root.querySelector("#detail-loading");
  const errorEl = root.querySelector("#detail-error");
  const container = root.querySelector("#park-detail");

  if (!parkCode) {
    loadingEl.style.display = "none";
    errorEl.style.display = "";
    errorEl.textContent = "No park code provided in the URL.";
    return;
  }

  try {
    const park = await getParkByCode({
      apiKey: CONFIG.NPS_API_KEY,
      parkCode,
    });

    if (!park) {
      throw new Error("Park not found");
    }

    // Build contact / location lines
    const address = park.addresses?.find(a => a.type === "Physical") || park.addresses?.[0] || null;
    const addressLine = address
      ? `${address.line1 || ""} ${address.line2 || ""} ${address.line3 || ""} ${address.city || ""} ${address.stateCode || ""} ${address.postalCode || ""}`.replace(/\s+/g, " ").trim()
      : "";

    const phone = park.contacts?.phoneNumbers?.[0]?.phoneNumber || "";
    const url = park.url || "";

    // Hero image
    const hero = park.images?.[0]?.url || "";

    // Render
    container.innerHTML = `
      <div class="park-hero">
        ${hero ? `<img src="${hero}" alt="${park.fullName}" />` : `<div class="img-placeholder" style="height:260px"></div>`}
      </div>

      <div class="panel" style="margin-top:16px;">
        <a class="link" href="#/">← Back to Discover</a>
        <h1>${park.fullName}</h1>
        <p class="muted">${park.designation || ""} ${park.states ? "• " + park.states : ""}</p>

        <div class="meta" style="margin:12px 0;">
          ${addressLine ? `<div><strong>Address</strong>: ${addressLine}</div>` : ""}
          ${phone ? `<div><strong>Phone</strong>: ${phone}</div>` : ""}
          ${url ? `<div><strong>Website</strong>: <a href="${url}" target="_blank" rel="noopener">${url}</a></div>` : ""}
        </div>

        <p>${park.description || "No description available."}</p>

        <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap;">
          <a class="btn" href="#/planner?code=${park.parkCode}&name=${encodeURIComponent(park.fullName)}">Plan Trip</a>
          <a class="btn secondary" href="${url}" target="_blank" rel="noopener">Official Site</a>
        </div>

        <div id="weather-block" style="margin-top:18px;"></div>
      </div>
    `;

    // Optionally fetch a simple weather summary if OPENWEATHER key exists and park has lat/lng
    const latLong = park.latitude && park.longitude ? { lat: park.latitude, lon: park.longitude } : null;
    if (CONFIG.OPENWEATHER_API_KEY && latLong) {
      try {
        const w = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latLong.lat}&lon=${latLong.lon}&units=imperial&appid=${CONFIG.OPENWEATHER_API_KEY}`);
        if (w.ok) {
          const weather = await w.json();
          const wb = container.querySelector("#weather-block");
          wb.innerHTML = `
            <h3>Current Weather</h3>
            <div class="meta">
              ${weather.weather?.[0]?.description || ""} • ${Math.round(weather.main?.temp)}°F
            </div>
          `;
        }
      } catch (we) {
        console.warn("Weather fetch failed", we);
      }
    }

    loadingEl.style.display = "none";
    container.style.display = "";
  } catch (err) {
    loadingEl.style.display = "none";
    errorEl.style.display = "";
    errorEl.textContent = `Failed to load park: ${err?.message || err}`;
    console.error("renderDetail error", err);
  }
}
