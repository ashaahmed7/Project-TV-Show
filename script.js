// Global variables
const EPISODES_URL = "https://api.tvmaze.com/shows/82/episodes";
const SHOWS_URL = "https://api.tvmaze.com/shows";
let EPISODES = [];
let SHOWS = [];

// Get episodes count element
const episodeCount = document.getElementById("ep-count");

// Get search input
const searchTerm = document.getElementById("search-input");

// Get ep select option
const select = document.getElementById("ep-select");

// Get show select option
const showSelect = document.getElementById("show-select");

// Event listeners
searchTerm.addEventListener("keyup", applyFilters);
select.addEventListener("change", applyFilters);
showSelect.addEventListener("change", showChange);

// Function to call on launch
async function init() {
  episodeCount.textContent = "Loading...";

  setTimeout(async function () {
    try {
      const allShows = await fetchShows();
      SHOWS = allShows;

      populateShowOptions();

      if (SHOWS.length > 0) {
        showSelect.value = SHOWS[0].id;
        await showChange();
      }
    } catch (error) {
      episodeCount.textContent = `Error: ${error.message}. Please try again later.`;
    }
  }, 2000);
}

// Show change function
async function showChange() {
  const showId = showSelect.value;
  episodeCount.textContent = "Loading episodes...";

  try {
    const response = await fetch(
      `https://api.tvmaze.com/shows/${showId}/episodes`,
    );
    const data = await response.json();

    EPISODES = data;
    searchTerm.value = "";
    populateEpOptions();
    renderEpisodes(EPISODES);
  } catch (error) {
    episodeCount.textContent = `Error loading episodes for this show: ${error.message}. Please try again later.`;
  }
}

// Populate select with show options
function populateShowOptions() {
  showSelect.innerHTML = "";

  SHOWS.forEach((show) => {
    const option = document.createElement("option");
    option.value = show.id;
    option.textContent = show.name;
    showSelect.appendChild(option);
  });

  populateEpOptions();
}

// Populate select with episode options
function populateEpOptions() {
  select.innerHTML = `<option value="all-episodes">Show all episodes</option>`;

  EPISODES.forEach((ep) => {
    const option = document.createElement("option");
    const code = seasonAndEpisodeFormat(String(ep.season), String(ep.number));
    option.value = ep.id;
    option.textContent = `${code} - ${ep.name}`;
    select.appendChild(option);
  });
}

// Creating card for each episode
function createCard(episode) {
  const filmCard = document.getElementById("ep-card").content.cloneNode(true);
  const code = seasonAndEpisodeFormat(
    String(episode.season),
    String(episode.number),
  );

  const title = filmCard.querySelector("h3");
  const image = filmCard.querySelector("img");
  const summary = filmCard.querySelector("p");

  title.textContent = `${episode.name} - ${code}`;
  image.src = episode.image.medium;
  summary.innerHTML = episode.summary;

  return filmCard;
}

// Formatting season and episode number
function seasonAndEpisodeFormat(season, episode) {
  season = season.padStart(2, "0");
  episode = episode.padStart(2, "0");
  return `S${season}E${episode}`;
}

// Fetching all episodes function
async function fetchEpisodes() {
  const response = await fetch(EPISODES_URL);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Fetching all shows function
async function fetchShows() {
  const response = await fetch(SHOWS_URL);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  return data.sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  );
}

// Rendering episodes function
function renderEpisodes(list) {
  const container = document.querySelector(".ep-container");
  const template = document.getElementById("ep-card");

  container.innerHTML = "";
  container.appendChild(template);

  for (const ep of list) {
    container.appendChild(createCard(ep));
  }

  episodeCount.textContent = `Displaying ${list.length} / ${EPISODES.length} episodes`;
}

// Filtering function
function applyFilters() {
  // Getting values of filters
  const query = searchTerm.value.toLowerCase();
  const selectedEp = select.value;

  // Creating new array
  let filteredEps = EPISODES;

  // Filter by search
  filteredEps = filteredEps.filter((ep) => {
    return (
      ep.name.toLowerCase().includes(query) ||
      (ep.summary || "").toLowerCase().includes(query)
    );
  });

  // Filter by dropdown
  if (selectedEp !== "all-episodes") {
    filteredEps = filteredEps.filter((ep) => ep.id === Number(selectedEp));
  }

  // Render again
  renderEpisodes(filteredEps);
}

// Calling initialize function
window.onload = init;
