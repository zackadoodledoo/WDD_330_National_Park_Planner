import { parseRoute } from "../router.js";

const STORAGE_KEY = "npp_saved_trips";

function loadSavedTrips() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveTrips(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function renderSaved(root) {
  root.innerHTML = `
    <section class="panel">
      <a class="link" href="#/">← Back to Discover</a>
      <h1>My Trips</h1>

      <div id="saved-loading" class="meta">Loading trips...</div>
      <div id="saved-error" class="muted" style="display:none;"></div>

      <div id="saved-list" class="grid" style="margin-top:12px;"></div>

      <div id="saved-empty" class="muted" style="margin-top:12px; display:none;">
        No saved trips yet. Plan a trip to get started.
      </div>
    </section>
  `;

  const loadingEl = root.querySelector("#saved-loading");
  const errorEl = root.querySelector("#saved-error");
  const listEl = root.querySelector("#saved-list");
  const emptyEl = root.querySelector("#saved-empty");

  function renderList() {
    const list = loadSavedTrips();
    loadingEl.style.display = "none";
    if (!list.length) {
      listEl.innerHTML = "";
      emptyEl.style.display = "";
      return;
    }
    emptyEl.style.display = "none";

    listEl.innerHTML = list
      .map((t, i) => {
        const dates = t.startDate && t.endDate ? `${t.startDate} → ${t.endDate}` : "Dates not set";
        return `
          <article class="card" data-index="${i}">
            <div class="card-body">
              <h3>${t.parkName || "Unnamed trip"}</h3>
              <div class="meta">${dates} • ${t.travelers || 1} traveler(s)</div>
              <p class="muted">${t.accommodation || ""}</p>

              <div class="trip-actions" style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
                <a class="btn" href="#/park?code=${encodeURIComponent(t.parkCode || "")}">View Park</a>
                <button class="btn" data-action="edit" data-index="${i}">Edit</button>
                <button class="btn secondary" data-action="delete" data-index="${i}">Delete</button>
                <button class="btn" data-action="calendar" data-index="${i}">Add to Calendar</button>
              </div>

              <div class="edit-area" style="margin-top:12px;display:none;">
                <form class="edit-form" data-index="${i}">
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    <input name="parkName" placeholder="Park name" value="${t.parkName || ""}" />
                    <input name="parkCode" placeholder="Park code" value="${t.parkCode || ""}" />
                    <input name="startDate" type="date" value="${t.startDate || ""}" />
                    <input name="endDate" type="date" value="${t.endDate || ""}" />
                    <input name="travelers" type="number" min="1" value="${t.travelers || 1}" />
                    <input name="accommodation" placeholder="Accommodation" value="${t.accommodation || ""}" />
                  </div>
                  <div style="margin-top:8px;display:flex;gap:8px;">
                    <button class="btn" type="submit">Save</button>
                    <button class="btn secondary" type="button" data-action="cancel-edit" data-index="${i}">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  // Event delegation for actions
  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const idx = Number(btn.dataset.index);
    const list = loadSavedTrips();

    if (action === "delete") {
      list.splice(idx, 1);
      saveTrips(list);
      renderList();
      return;
    }

    if (action === "edit") {
      const card = listEl.querySelector(`article[data-index="${idx}"]`);
      if (!card) return;
      const editArea = card.querySelector(".edit-area");
      editArea.style.display = editArea.style.display === "none" ? "" : "none";
      return;
    }

    if (action === "calendar") {
      const trip = list[idx];
      // Prepare a calendar event object and expose it for integration
      const event = {
        title: `${trip.parkName || "Trip"}`,
        start_at: trip.startDate ? `${trip.startDate}T09:00:00` : null,
        end_at: trip.endDate ? `${trip.endDate}T17:00:00` : null,
        location: trip.parkName || null,
        description: `Travelers: ${trip.travelers}\nAccommodation: ${trip.accommodation}\nNotes: ${trip.notes || ""}`,
      };
      // Expose for manual testing or integration
      window.__npp_last_event = event;
      // Provide quick feedback
      btn.textContent = "Prepared";
      setTimeout(() => (btn.textContent = "Add to Calendar"), 1500);
      return;
    }
  });

  // Handle edit form submit and cancel
  listEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target.closest(".edit-form");
    if (!form) return;
    const idx = Number(form.dataset.index);
    const list = loadSavedTrips();
    const fd = new FormData(form);

    const updated = {
      ...list[idx],
      parkName: fd.get("parkName") || "",
      parkCode: fd.get("parkCode") || "",
      startDate: fd.get("startDate") || "",
      endDate: fd.get("endDate") || "",
      travelers: Number(fd.get("travelers")) || 1,
      accommodation: fd.get("accommodation") || "",
      updatedAt: new Date().toISOString(),
    };

    list[idx] = updated;
    saveTrips(list);
    renderList();
  });

  listEl.addEventListener("click", (e) => {
    const cancel = e.target.closest("button[data-action='cancel-edit']");
    if (!cancel) return;
    const idx = Number(cancel.dataset.index);
    const card = listEl.querySelector(`article[data-index="${idx}"]`);
    if (!card) return;
    const editArea = card.querySelector(".edit-area");
    editArea.style.display = "none";
  });

  // Initial render
  try {
    renderList();
  } catch (err) {
    loadingEl.style.display = "none";
    errorEl.style.display = "";
    errorEl.textContent = `Failed to load saved trips: ${err?.message || err}`;
  }
}
