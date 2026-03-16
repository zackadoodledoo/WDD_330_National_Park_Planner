import { parseRoute } from "./router.js";
import { renderHome } from "./views/homeView.js";
import { renderDetail } from "./views/detailView.js";
import { renderPlanner } from "./views/plannerView.js";
import { renderSaved } from "./views/savedView.js";

const app = document.querySelector("#app");

async function render() {
  const { path, params } = parseRoute();

  app.innerHTML = `<div class="loading">Loading...</div>`;

  try {
    if (path === "/") return await renderHome(app);
    if (path === "/park") return await renderDetail(app, params);
    if (path === "/planner") return await renderPlanner(app, params);
    if (path === "/saved") return await renderSaved(app);

    app.innerHTML = `<h2>Not found</h2>`;
  } catch (err) {
    app.innerHTML = `
      <div class="error">
        <h2>Something went wrong</h2>
        <pre>${err?.message || err}</pre>
      </div>
    `;
  }
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);
