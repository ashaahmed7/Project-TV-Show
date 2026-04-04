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
  const template = document.getElementById("episodeCardTemplate");
  const clone = template.content.cloneNode(true);
  const card = clone.querySelector(".episode-card");

  const code = formatEpisodeCode(ep.season, ep.number);

  // Fill text data
  card.querySelector(".badge").textContent = code;
  card.querySelector(".episode-title").textContent = ep.name;
  card.querySelector(".season-num").textContent = ep.season;
  card.querySelector(".episode-num").textContent = ep.number;

  // Episode Summary
  card.querySelector(".episode-summary").innerHTML =
    ep.summary || "<p>No summary available.</p>";

  // Episode Image
  const img = card.querySelector(".thumb");
  const placeholder = card.querySelector(".placeholder");
  if (ep.image?.medium) {
    img.src = ep.image.medium;
    img.alt = `${ep.name} (${code})`;
    placeholder.remove();
  } else {
    img.remove();
  }

  // Handle Link
  card.querySelector(".link-chip").href = ep.url || "#";

  return card;
}

// Main render
function renderApp() {
  const allEpisodes = getAllEpisodes();
  const searchInput = document.getElementById("searchInput");
  const episodeSelect = document.getElementById("episodeSelect");
  const searchCount = document.getElementById("searchCount");
  const grid = document.getElementById("episodeGrid");

  // Populate Dropdown
  allEpisodes.forEach((ep) => {
    const option = document.createElement("option");
    option.value = ep.id;
    option.textContent = `${formatEpisodeCode(ep.season, ep.number)} - ${ep.name}`;
    episodeSelect.appendChild(option);
  });

  const handleChange = () => {
    updateDisplay(
      allEpisodes,
      searchInput.value,
      episodeSelect.value,
      grid,
      searchCount,
    );
  };

  searchInput.addEventListener("input", handleChange);
  episodeSelect.addEventListener("change", handleChange);

  // Initial render
  handleChange();
}

// Updating display based on search filters
function updateDisplay(allEpisodes, term, selectedId, grid, countDisplay) {
  const searchTerm = term.toLowerCase();

  const filtered = allEpisodes.filter((ep) => {
    const matchesSelect = selectedId === "ALL" || String(ep.id) === selectedId;
    const matchesSearch =
      ep.name.toLowerCase().includes(searchTerm) ||
      (ep.summary && ep.summary.toLowerCase().includes(searchTerm));
    return matchesSelect && matchesSearch;
  });

  grid.innerHTML = "";
  const fragment = document.createDocumentFragment();
  filtered.forEach((ep) => fragment.appendChild(createEpisodeCard(ep)));
  grid.appendChild(fragment);

  countDisplay.textContent = `Displaying ${filtered.length}/${allEpisodes.length} episodes`;
}

renderApp();
