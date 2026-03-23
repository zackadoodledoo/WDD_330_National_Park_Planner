import { parseRoute } from "../router.js";
import { getParkByCode } from "../api/parks.js";
import { CONFIG } from "../config.js";

const STORAGE_KEY = "npp_saved_trips";

function loadSavedTrips() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveTripToStorage(trip) {
  const list = loadSavedTrips();
  list.unshift(trip);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function renderPlanner(root, params) {
  // Accept params from main.js or fallback to parseRoute
  const route = parseRoute();
  const p = params || route.params || {};
  const parkCode = p.code || "";
  const parkName = p.name ? decodeURIComponent(p.name) : "";

  root.innerHTML = `
    <section class="panel">
      <a class="link" href="#/">← Back to Discover</a>
      <h1>Plan Your Trip</h1>

      <div id="planner-loading" class="meta">Preparing planner...</div>
      <div id="planner-error" class="muted" style="display:none;"></div>

      <form id="plannerForm" style="display:none; margin-top:12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label><strong>Park</strong></label>
            <input id="parkName" name="parkName" readonly />
          </div>

          <div>
            <label><strong>Park Code</strong></label>
            <input id="parkCode" name="parkCode" readonly />
          </div>

          <div>
            <label><strong>Start Date</strong></label>
            <input id="startDate" name="startDate" type="date" required />
          </div>

          <div>
            <label><strong>End Date</strong></label>
            <input id="endDate" name="endDate" type="date" required />
          </div>

          <div>
            <label><strong>Travelers</strong></label>
            <input id="travelers" name="travelers" type="number" min="1" value="2" />
          </div>

          <div>
            <label><strong>Accommodation</strong></label>
            <input id="accommodation" name="accommodation" placeholder="Campground, hotel, etc." />
          </div>
        </div>

        <div style="margin-top:12px;">
          <label><strong>Notes</strong></label>
          <textarea id="notes" name="notes" rows="4" placeholder="Packing, permits, trail plans"></textarea>
        </div>

        <div style="display:flex;gap:12px;margin-top:12px;flex-wrap:wrap;">
          <button class="btn" id="saveTrip">Save Trip</button>
          <button class="btn secondary" id="saveAndCalendar" type="button">Save and Add to Calendar</button>
          <a class="btn" id="backToPark" href="#/">Back</a>
        </div>
      </form>

      <div id="planner-confirm" style="margin-top:12px;"></div>

      <hr style="margin:18px 0;" />

      <div>
        <h2>Saved Trips</h2>
        <div id="savedList" class="grid"></div>
      </div>
    </section>
  `;

  const loadingEl = root.querySelector("#planner-loading");
  const errorEl = root.querySelector("#planner-error");
  const form = root.querySelector("#plannerForm");
  const parkNameInput = root.querySelector("#parkName");
  const parkCodeInput = root.querySelector("#parkCode");
  const startDateInput = root.querySelector("#startDate");
  const endDateInput = root.querySelector("#endDate");
  const travelersInput = root.querySelector("#travelers");
  const accommodationInput = root.querySelector("#accommodation");
  const notesInput = root.querySelector("#notes");
  const saveBtn = root.querySelector("#saveTrip");
  const saveAndCalendarBtn = root.querySelector("#saveAndCalendar");
  const confirmEl = root.querySelector("#planner-confirm");
  const savedListEl = root.querySelector("#savedList");
  const backToParkLink = root.querySelector("#backToPark");

  // Prefill from params
  parkNameInput.value = parkName || "";
  parkCodeInput.value = parkCode || "";

  // If we have a parkCode but not a name, fetch park to get name
  try {
    if (parkCode && !parkName) {
      const park = await getParkByCode({ apiKey: CONFIG.NPS_API_KEY, parkCode });
      if (park) {
        parkNameInput.value = park.fullName || "";
        backToParkLink.href = `#/park?code=${encodeURIComponent(parkCode)}`;
      }
    } else if (parkCode) {
      backToParkLink.href = `#/park?code=${encodeURIComponent(parkCode)}`;
    }

    loadingEl.style.display = "none";
    form.style.display = "";
  } catch (err) {
    loadingEl.style.display = "none";
    errorEl.style.display = "";
    errorEl.textContent = `Failed to load park info: ${err.message || err}`;
    return;
  }

  // Render saved trips
  function renderSaved() {
    const list = loadSavedTrips();
    if (!list.length) {
      savedListEl.innerHTML = `<div class="muted">No saved trips yet.</div>`;
      return;
    }

    savedListEl.innerHTML = list
      .map((t, i) => {
        const dates = t.startDate && t.endDate ? `${t.startDate} → ${t.endDate}` : "Dates not set";
        return `
          <article class="card">
            <div class="card-body">
              <h3>${t.parkName || "Unnamed trip"}</h3>
              <div class="meta">${dates} • ${t.travelers || 1} traveler(s)</div>
              <p class="muted">${t.accommodation || ""}</p>
              <div style="display:flex;gap:8px;margin-top:8px;">
                <a class="btn" href="#/park?code=${encodeURIComponent(t.parkCode || "")}">View Park</a>
                <button class="btn secondary" data-index="${i}" data-action="delete">Delete</button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  savedListEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const idx = Number(btn.dataset.index);
    if (btn.dataset.action === "delete") {
      const list = loadSavedTrips();
      list.splice(idx, 1);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      renderSaved();
    }
  });

  renderSaved();

  // Save handler
  saveBtn.addEventListener("click", (ev) => {
    ev.preventDefault();

    const trip = {
      id: Date.now().toString(),
      parkCode: parkCodeInput.value || "",
      parkName: parkNameInput.value || "",
      startDate: startDateInput.value || "",
      endDate: endDateInput.value || "",
      travelers: Number(travelersInput.value) || 1,
      accommodation: accommodationInput.value || "",
      notes: notesInput.value || "",
      createdAt: new Date().toISOString(),
    };

    saveTripToStorage(trip);
    confirmEl.innerHTML = `<div class="meta">Trip saved for <strong>${trip.parkName}</strong> ${trip.startDate ? `on ${trip.startDate}` : ""}.</div>`;
    renderSaved();
  });

  // Save and prepare calendar event payload
  saveAndCalendarBtn.addEventListener("click", async (ev) => {
    ev.preventDefault();

    const trip = {
      id: Date.now().toString(),
      parkCode: parkCodeInput.value || "",
      parkName: parkNameInput.value || "",
      startDate: startDateInput.value || "",
      endDate: endDateInput.value || "",
      travelers: Number(travelersInput.value) || 1,
      accommodation: accommodationInput.value || "",
      notes: notesInput.value || "",
      createdAt: new Date().toISOString(),
    };

    saveTripToStorage(trip);
    renderSaved();
    confirmEl.innerHTML = `<div class="meta">Trip saved. Preparing calendar event...</div>`;

    // Build a simple calendar event object for later integration
    const event = {
      title: `${trip.parkName} trip`,
      start_at: trip.startDate ? `${trip.startDate}T09:00:00` : null,
      end_at: trip.endDate ? `${trip.endDate}T17:00:00` : null,
      location: trip.parkName,
      description: `Travelers: ${trip.travelers}\nAccommodation: ${trip.accommodation}\nNotes: ${trip.notes}`,
    };

    // Expose the event object on window for manual testing or later integration
    window.__npp_last_event = event;
    confirmEl.innerHTML = `<div class="meta">Trip saved. Calendar event prepared. Use integration to add to calendar.</div>`;
  });
}
