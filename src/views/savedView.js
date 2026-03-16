//savedView.js file

export async function renderSaved(root) {
  root.innerHTML = `
    <section class="panel">
      <h1>Saved Trips</h1>
      <p>Saved trips view is working.</p>
      <a href="#/">← Back to Discover</a>
    </section>
  `;
}
