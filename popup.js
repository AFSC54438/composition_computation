import { getTopTracks, getTopArtists } from "./spot.js";
import { logout } from "./auth.js";

const listEl = document.getElementById("list");
const seeAllBtn = document.getElementById("see-all");

let selectedRange = "short_term";
let selectedView = "tracks";

// ── Time range buttons ───────────────────────────────────
document.querySelectorAll(".time-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".time-btn").forEach((b) => {
      b.classList.remove("bg-[#1DB954]", "text-black", "font-medium");
      b.classList.add("bg-[#2a2a2a]", "text-[#aaa]", "border", "border-[#333]");
    });
    btn.classList.remove("bg-[#2a2a2a]", "text-[#aaa]", "border", "border-[#333]");
    btn.classList.add("bg-[#1DB954]", "text-black", "font-medium");
    selectedRange = btn.dataset.range;
  });
});

// ── View toggle buttons ──────────────────────────────────
document.querySelectorAll(".view-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".view-btn").forEach((b) => {
      b.classList.remove("text-white", "border-[#1DB954]");
      b.classList.add("text-[#aaa]", "border-[#333]");
      b.querySelector("svg").classList.remove("text-[#1DB954]");
    });
    btn.classList.remove("text-[#aaa]", "border-[#333]");
    btn.classList.add("text-white", "border-[#1DB954]");
    btn.querySelector("svg").classList.add("text-[#1DB954]");
    selectedView = btn.dataset.view;
    seeAllBtn.textContent =
      selectedView === "tracks" ? "See top tracks" : "See top artists";
  });
});

// ── Fetch & render ───────────────────────────────────────
seeAllBtn.addEventListener("click", async () => {
  setLoading(true);
  try {
    const items =
      selectedView === "tracks"
        ? await getTopTracks(selectedRange)
        : await getTopArtists(selectedRange);
    renderList(items);
    console.log(items);
  } catch (err) {
    renderError(err.message);
    console.log(err);
    console.log(chrome.identity.getRedirectURL());
  } finally {
    setLoading(false);
  }
});

function renderList(items) {
  listEl.innerHTML = items
    .map(
      (item) => `
      <div class="flex items-center gap-3 px-3.5 py-3 border-b border-[#222] last:border-0">
        <span class="text-[11px] text-[#555] min-w-[14px]">${item.rank}</span>
        ${
          item.image
            ? `<img src="${item.image}" class="w-9 h-9 rounded-md flex-shrink-0" alt="">`
            : `<div class="w-9 h-9 rounded-md bg-[#2a2a2a] flex-shrink-0"></div>`
        }
        <div class="flex-1 min-w-0">
          <p class="text-white text-[13px] font-medium truncate m-0">${item.name}</p>
          ${
            item.subtitle && item.subtitle !== "—"
              ? `<p class="text-[#777] text-[11px] truncate m-0">${item.subtitle}</p>`
              : ""
          }
        </div>
      </div>`
    )
    .join("");
}

function setLoading(on) {
  seeAllBtn.disabled = on;
  seeAllBtn.textContent = on
    ? "Loading..."
    : selectedView === "tracks"
    ? "See top tracks"
    : "See top artists";
  if (on) {
    listEl.innerHTML = `<p class="text-[#555] text-xs text-center py-6">Fetching your stats...</p>`;
  }
}

function renderError(msg) {
  listEl.innerHTML = `<p class="text-red-400 text-xs text-center py-6">${msg}</p>`;
}

// ── Logout (optional) ────────────────────────────────────
document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await logout();
  listEl.innerHTML = `<p class="text-[#555] text-xs text-center py-6">Logged out.</p>`;
});