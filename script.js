// ============================================================
//  CACHE — never fetch the same URL more than once per visit
// ============================================================
const fetchCache = new Map(); // url → Promise<data>

async function cachedFetch(url) {
  if (!fetchCache.has(url)) {
    fetchCache.set(
      url,
      fetch(url).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
    );
  }
  return fetchCache.get(url);
}

// ============================================================
//  GLOBAL STATE
// ============================================================
const SHOWS_URL = "https://api.tvmaze.com/shows";

let SHOWS = []; // all shows from API
let EPISODES = []; // episodes for the currently-open show

// ============================================================
//  DOM REFS — shows view
// ============================================================
const showsView = document.getElementById("shows-view");
const showsContainer = document.getElementById("shows-container");
const showSearchInput = document.getElementById("show-search-input");
const showCount = document.getElementById("show-count");

// ============================================================
//  DOM REFS — episodes view
// ============================================================
const episodesView = document.getElementById("episodes-view");
const currentShowTitle = document.getElementById("current-show-title");
const backBtn = document.getElementById("back-btn");
const epSelect = document.getElementById("ep-select");
const searchInput = document.getElementById("search-input");
const epCount = document.getElementById("ep-count");
const epContainer = document.querySelector(".ep-container");
const epCardTemplate = document.getElementById("ep-card");

// ============================================================
//  INIT
// ============================================================
async function init() {
  showCount.textContent = "Loading shows…";

  try {
    const data = await cachedFetch(SHOWS_URL);

    SHOWS = data.sort((a, b) =>
      (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase()),
    );

    renderShows(SHOWS);
  } catch (err) {
    showCount.textContent = `Error: ${err.message}`;
  }
}

// ============================================================
//  SHOWS VIEW — render grid
// ============================================================
function renderShows(list) {
  showsContainer.innerHTML = "";
  showCount.textContent = `Showing ${list.length} / ${SHOWS.length} shows`;

  if (list.length === 0) {
    const msg = document.createElement("p");
    msg.className = "no-results";
    msg.textContent = "No shows matched your search.";
    showsContainer.appendChild(msg);
    return;
  }

  list.forEach((show) => showsContainer.appendChild(buildShowCard(show)));
}

function buildShowCard(show) {
  const card = document.createElement("article");
  card.className = "show-card";

  // poster image
  if (show.image?.medium) {
    const img = document.createElement("img");
    img.className = "show-card-img";
    img.src = show.image.medium;
    img.alt = show.name || "";
    img.loading = "lazy";
    card.appendChild(img);
  }

  // card body
  const body = document.createElement("div");
  body.className = "show-card-body";

  // clickable show name
  const nameBtn = document.createElement("button");
  nameBtn.className = "show-card-name";
  nameBtn.textContent = show.name || "Untitled";
  nameBtn.addEventListener("click", () => openEpisodesView(show));
  body.appendChild(nameBtn);

  // meta badges
  const meta = document.createElement("div");
  meta.className = "show-card-meta";

  if (show.status) meta.appendChild(makeBadge(show.status, "badge-status"));
  if (show.rating?.average)
    meta.appendChild(makeBadge(`★ ${show.rating.average}`, "badge-rating"));
  if (show.runtime)
    meta.appendChild(makeBadge(`${show.runtime} min`, "badge-runtime"));
  (show.genres || []).forEach((g) =>
    meta.appendChild(makeBadge(g, "badge-genre")),
  );

  body.appendChild(meta);

  // summary (HTML stripped to plain text for safety)
  if (show.summary) {
    const p = document.createElement("p");
    p.className = "show-card-summary";
    p.innerHTML = show.summary; // TVMaze returns safe HTML
    body.appendChild(p);
  }

  card.appendChild(body);
  return card;
}

function makeBadge(text, cls) {
  const span = document.createElement("span");
  span.className = `badge ${cls}`;
  span.textContent = text;
  return span;
}

// ============================================================
//  SHOWS VIEW — free-text search
// ============================================================
showSearchInput.addEventListener("input", () => {
  const q = showSearchInput.value.trim().toLowerCase();

  if (!q) {
    renderShows(SHOWS);
    return;
  }

  const filtered = SHOWS.filter((show) => {
    const name = (show.name || "").toLowerCase();
    const summary = stripHtml(show.summary || "").toLowerCase();
    const genres = (show.genres || []).join(" ").toLowerCase();
    return name.includes(q) || summary.includes(q) || genres.includes(q);
  });

  renderShows(filtered);
});

// ============================================================
//  EPISODES VIEW — open (called when a show name is clicked)
// ============================================================
async function openEpisodesView(show) {
  // swap views — using style.display so no CSS class needed
  showsView.style.display = "none";
  episodesView.style.display = "block";

  // reset episode controls
  currentShowTitle.textContent = show.name;
  epSelect.innerHTML = `<option value="all-episodes">Show all episodes</option>`;
  searchInput.value = "";
  epCount.textContent = "Loading episodes…";
  clearEpisodeCards();

  try {
    const url = `https://api.tvmaze.com/shows/${show.id}/episodes`;
    EPISODES = await cachedFetch(url); // ← cached; never re-fetched

    populateEpOptions();
    renderEpisodes(EPISODES);
  } catch (err) {
    epCount.textContent = `Error: ${err.message}`;
  }
}

// ============================================================
//  EPISODES VIEW — selector
// ============================================================
function populateEpOptions() {
  epSelect.innerHTML = `<option value="all-episodes">Show all episodes</option>`;

  EPISODES.forEach((ep) => {
    const option = document.createElement("option");
    option.value = ep.id;
    option.textContent = `${fmt(ep.season, ep.number)} – ${ep.name}`;
    epSelect.appendChild(option);
  });
}

// ============================================================
//  EPISODES VIEW — render cards
// ============================================================
function renderEpisodes(list) {
  clearEpisodeCards();
  epCount.textContent = `Displaying ${list.length} / ${EPISODES.length} episodes`;

  list.forEach((ep) => {
    const clone = epCardTemplate.content.cloneNode(true);
    const img = clone.querySelector(".ep-img");
    const title = clone.querySelector(".ep-title");
    const summary = clone.querySelector(".ep-summary");

    title.textContent = `${ep.name} – ${fmt(ep.season, ep.number)}`;

    if (ep.image?.medium) {
      img.src = ep.image.medium;
      img.alt = ep.name;
    } else {
      img.style.display = "none";
    }

    summary.innerHTML = ep.summary || "";
    epContainer.appendChild(clone);
  });
}

function clearEpisodeCards() {
  epContainer.querySelectorAll(".ep-section").forEach((el) => el.remove());
}

// ============================================================
//  EPISODES VIEW — filters (search + dropdown)
// ============================================================
function applyFilters() {
  const query = searchInput.value.toLowerCase();
  const selectedEp = epSelect.value;

  let filtered = EPISODES;

  if (query) {
    filtered = filtered.filter(
      (ep) =>
        ep.name.toLowerCase().includes(query) ||
        (ep.summary || "").toLowerCase().includes(query),
    );
  }

  if (selectedEp !== "all-episodes") {
    filtered = filtered.filter((ep) => ep.id === Number(selectedEp));
  }

  renderEpisodes(filtered);
}

searchInput.addEventListener("keyup", applyFilters);
epSelect.addEventListener("change", applyFilters);

// ============================================================
//  BACK BUTTON
// ============================================================
backBtn.addEventListener("click", () => {
  episodesView.style.display = "none";
  showsView.style.display = "block";
});

// ============================================================
//  HELPERS
// ============================================================
function fmt(season, episode) {
  return `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

// ============================================================
//  BOOT
// ============================================================
window.onload = init;
