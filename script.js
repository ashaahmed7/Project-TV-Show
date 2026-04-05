/* global getAllEpisodes */
const RAW_EPISODES_URL = "https://api.tvmaze.com/shows/82/episodes.";
const EPISODES_URL = RAW_EPISODES_URL.replace(/\.$/, "");

/**
 * Episode code must be zero-padded to two digits.
 */
function formatEpisodeCode(season, number) {
  const s = String(season).padStart(2, "0");
  const e = String(number).padStart(2, "0");
  return `S${s}E${e}`;
}

/**
 * TVMaze summaries are often HTML (e.g. <p>...</p>).
 * We render HTML, but provide a fallback if it’s empty/null.
 */
function normaliseSummary(summaryHtml) {
  if (!summaryHtml) return "<p>No summary available.</p>";
  const textOnly = String(summaryHtml)
    .replace(/<[^>]*>/g, "")
    .trim();
  return textOnly ? summaryHtml : "<p>No summary available.</p>";
}

/** Strip HTML for searching (so searches match actual text, not tags). */
function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * We cache the promise so searches/dropdown changes never re-fetch.
 */
let episodesPromise = null;

function getAllEpisodesOnce() {
  if (!episodesPromise) {
    episodesPromise = (async () => {
      // Visit: yoursite.com/?simulateError=1 to test the error UI.
      const params = new URLSearchParams(window.location.search);
      if (params.has("simulateError")) {
        throw new Error(
          "Simulated loading error (remove ?simulateError=1 to load normally).",
        );
      }

      const res = await fetch(EPISODES_URL);
      if (!res.ok) {
        throw new Error(`Failed to load episodes (HTTP ${res.status}).`);
      }
      return res.json();
    })();
  }
  return episodesPromise;
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

  // Episode Summary (HTML allowed from API)
  card.querySelector(".episode-summary").innerHTML = normaliseSummary(
    ep.summary,
  );

  // Episode Image
  const img = card.querySelector(".thumb");
  const placeholder = card.querySelector(".placeholder");

  if (ep.image && ep.image.medium) {
    img.src = ep.image.medium;
    img.alt = `${ep.name} (${code})`;
    if (placeholder) placeholder.remove();
  } else {
    if (img) img.remove();
  }

  // Handle Link
  const link = card.querySelector(".link-chip");
  link.href = ep.url || "#";
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  return card;
}

function setLoadingUI(isLoading) {
  const searchInput = document.getElementById("searchInput");
  const episodeSelect = document.getElementById("episodeSelect");
  const searchCount = document.getElementById("searchCount");
  const grid = document.getElementById("episodeGrid");

  if (isLoading) {
    searchInput.disabled = true;
    episodeSelect.disabled = true;
    searchCount.textContent = "Loading episodes…";
    grid.innerHTML = `<p style="padding:1rem;">Loading episodes, please wait…</p>`;
  } else {
    searchInput.disabled = false;
    episodeSelect.disabled = false;
  }
}

function showErrorUI(message) {
  const searchCount = document.getElementById("searchCount");
  const grid = document.getElementById("episodeGrid");

  searchCount.textContent = "Could not load episodes.";
  grid.innerHTML = `
    <div style="padding:1rem; border:1px solid #c00; border-radius:12px;">
      <h3 style="margin:0 0 .5rem; color:#c00;">Error loading data</h3>
      <p style="margin:0 0 .75rem;">${message}</p>
      <p style="margin:0;">
        Please refresh the page to try again.
        <br />
        <small>Tip: add <code>?simulateError=1</code> to the URL to test this error state.</small>
      </p>
    </div>
  `;
}

// Updating display based on search filters
function updateDisplay(allEpisodes, term, selectedId, grid, countDisplay) {
  const searchTerm = term.trim().toLowerCase();

  const filtered = allEpisodes.filter((ep) => {
    const matchesSelect = selectedId === "ALL" || String(ep.id) === selectedId;

    const name = (ep.name || "").toLowerCase();
    const summaryText = stripHtml(ep.summary).toLowerCase();

    const matchesSearch =
      searchTerm === "" ||
      name.includes(searchTerm) ||
      summaryText.includes(searchTerm);

    return matchesSelect && matchesSearch;
  });

  grid.innerHTML = "";
  const fragment = document.createDocumentFragment();
  filtered.forEach((ep) => fragment.appendChild(createEpisodeCard(ep)));
  grid.appendChild(fragment);

  countDisplay.textContent = `Displaying ${filtered.length}/${allEpisodes.length} episodes`;
}

// Main render (async because we wait for fetch)
async function renderApp() {
  const searchInput = document.getElementById("searchInput");
  const episodeSelect = document.getElementById("episodeSelect");
  const searchCount = document.getElementById("searchCount");
  const grid = document.getElementById("episodeGrid");

  setLoadingUI(true);

  let allEpisodes;
  try {
    allEpisodes = await getAllEpisodesOnce(); // fetches only once per visit
  } catch (err) {
    setLoadingUI(false);
    showErrorUI(err.message || "Unknown error.");
    return;
  }

  setLoadingUI(false);

  // Populate Dropdown (include ALL option)
  episodeSelect.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "ALL";
  allOpt.textContent = "All episodes";
  episodeSelect.appendChild(allOpt);

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

// Run when DOM is ready
document.addEventListener("DOMContentLoaded", renderApp);
