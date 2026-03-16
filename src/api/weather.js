// weather api js

import { CONFIG } from "../config";

export async function getForecast({ apiKey, lat, lon }) {
  const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "imperial");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Weather error: ${res.status}`);
  return res.json();
}
