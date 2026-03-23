
export function distanceMiles(lat1, lon1, lat2, lon2) {
  // Haversine formula
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getCurrentPosition(options = { enableHighAccuracy: true, timeout: 10000 }) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      options
    );
  });
}

// Simple geocode using Nominatim (OpenStreetMap). Public endpoint; respect usage limits.
export async function geocodeAddress(address) {
  if (!address) throw new Error("No address provided");
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "en-US,en;q=0.9" },
  });
  if (!res.ok) throw new Error(`Geocode error: ${res.status}`);
  const data = await res.json();
  if (!data || !data[0]) throw new Error("Location not found");
  return { lat: Number(data[0].lat), lon: Number(data[0].lon) };
}
