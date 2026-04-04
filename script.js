/* global getAllEpisodes */

/**
 * Requirement #3: Episode code must be zero-padded to two digits.
 * Example: S02E07
 */
function formatEpisodeCode(season, number) {
  const s = String(season).padStart(2, "0");
  const e = String(number).padStart(2, "0");
  return `S${s}E${e}`;
}

/**
 * TVMaze summaries are often HTML (e.g. <p>...</p>).
 * We’ll render HTML, but provide a fallback if it’s empty/null.
 */
function normaliseSummary(summaryHtml) {
  if (!summaryHtml) return "<p>No summary available.</p>";
  const textOnly = String(summaryHtml)
    .replace(/<[^>]*>/g, "")
    .trim();
  return textOnly ? summaryHtml : "<p>No summary available.</p>";
}

/** Small helpers for safe insertion (we allow summary HTML as-provided). */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("`", "&#096;");
}

function createEpisodeCard(ep) {
  // Requirement #2: name, season, episode number, medium image, summary
  const name = ep.name ?? "Untitled episode";
  const season = ep.season ?? 0;
  const number = ep.number ?? 0;

  const code = formatEpisodeCode(season, number);

  // Requirement #2.4: medium-sized image for the episode (TVMaze provides image.medium when available) [1](https://www.tvmaze.com/api)
  const imgUrl = ep.image?.medium || "";
  const imgAlt = `${name} (${code})`;

  // Requirement #4: link back to TVMaze (API provides episode.url we can link to) [1](https://www.tvmaze.com/api)
  const tvmazeUrl = ep.url || "https://www.tvmaze.com/";

  const summaryHtml = normaliseSummary(ep.summary);

  const card = document.createElement("article");
  card.className = "episode-card";

  card.innerHTML = `
    <div class="thumb-wrap">
      ${
        imgUrl
          ? `<img class="thumb" src="${escapeAttr(imgUrl)}" alt="${escapeAttr(
              imgAlt,
            )}" loading="lazy" />`
          : `<div class="thumb placeholder" role="img" aria-label="No image available">No image</div>`
      }
    </div>

    <div class="episode-content">
      <div class="episode-meta">
        <span class="badge">${code}</span>
        <h2 class="episode-title">${escapeHtml(name)}</h2>
      </div>

      <p class="episode-submeta">
        <strong>Season:</strong> ${season}
        &nbsp; <strong>Episode:</strong> ${number}
      </p>

      <div class="episode-summary">
        ${summaryHtml}
      </div>

      <div class="episode-links">
        <a class="link-chip" href="${escapeAttr(tvmazeUrl)}" target="_blank" rel="noopener noreferrer">
          View this episode on TVMaze
        </a>
      </div>
    </div>
  `;

  return card;
}

function renderApp() {
  const root = document.getElementById("root");
  if (!root) return;

  // Provided by episodes.js (per your scaffold comment)
  const episodes = getAllEpisodes();

  // Requirement #1: All episodes must be shown
  // Render every episode in the array.
  root.innerHTML = `
    <header class="site-header">
      <div class="container">
        <h1 class="title">TV Show Episode Guide</h1>
        <p class="subtitle">Showing <strong>${episodes.length}</strong> episodes.</p>
      </div>
    </header>

    <main class="container">
      <section id="episodeGrid" class="episode-grid" aria-label="All episodes"></section>
    </main>

    <footer class="site-footer">
      <div class="container">
        <p>
          Episode data originally comes from
          <a href="https://www.tvmaze.com/" target="_blank" rel="noopener noreferrer">TVMaze.com</a>.
        </p>
        <p class="muted">
          TVMaze API licensing requires proper credit and link-back:
          <a href="https://www.tvmaze.com/api#licensing" target="_blank" rel="noopener noreferrer">tvmaze.com/api#licensing</a>.
        </p>
      </div>
    </footer>
  `;

  const grid = document.getElementById("episodeGrid");
  const fragment = document.createDocumentFragment();

  for (const ep of episodes) {
    fragment.appendChild(createEpisodeCard(ep));
  }

  grid.appendChild(fragment);
}

renderApp();
