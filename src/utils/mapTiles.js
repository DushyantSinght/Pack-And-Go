// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
// Map tiles. Defaults to OpenStreetMap's standard tiles (fine for light use with
// attribution). For production traffic set VITE_MAP_TILE_URL to a provider you have
// a key for, e.g. https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=YOUR_KEY
export const CUSTOM_TILES = !!import.meta.env.VITE_MAP_TILE_URL;
export const MAP_TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const MAP_ATTRIBUTION =
  import.meta.env.VITE_MAP_ATTRIBUTION || '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
