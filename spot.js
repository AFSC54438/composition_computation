import { getOrRefreshValidToken } from "./auth.js";

const BASE_URL = "https://api.spotify.com/v1";

async function spotifyFetch(endpoint) {
  const token = await getOrRefreshValidToken();
  
  if (!token) {
    console.warn("No valid Spotify token available. User needs to re-authenticate.");
    throw new Error("Unauthorized: No valid Spotify token found.");
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Error fetching from Spotify:", err);
    throw new Error(err.error?.message ?? `Spotify error ${res.status}`);
  }

  return res.json();
}

export async function getTopTracks(timeRange) {
  const data = await spotifyFetch(
    `/me/top/tracks?limit=10&time_range=${timeRange}`
  );
  return data.items.map((track, i) => ({
    rank: i + 1,
    name: track.name,
    subtitle: track.artists.map((a) => a.name).join(", "),
    image: track.album.images[2]?.url ?? null,
  }));
}

export async function getTopArtists(timeRange) {
  const data = await spotifyFetch(
    `/me/top/artists?limit=10&time_range=${timeRange}`
  );
  return data.items.map((artist, i) => ({
    rank: i + 1,
    name: artist.name,
    image: artist.images[2]?.url ?? null,
  }));
}