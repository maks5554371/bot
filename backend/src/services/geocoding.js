const axios = require('axios');

const cache = new Map();

async function geocodeAddress(address) {
  const normalized = (address || '').trim();
  if (!normalized) return null;

  if (cache.has(normalized)) {
    return cache.get(normalized);
  }

  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: {
      q: normalized,
      format: 'json',
      limit: 1,
    },
    headers: {
      'User-Agent': 'quest-backend/1.0 (geocoder)',
    },
    timeout: 5000,
  });

  const first = response.data?.[0];
  if (!first) return null;

  const result = {
    lat: Number(first.lat),
    lng: Number(first.lon),
    address_text: first.display_name || normalized,
  };

  cache.set(normalized, result);
  return result;
}

module.exports = { geocodeAddress };
