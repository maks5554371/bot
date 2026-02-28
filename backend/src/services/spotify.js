const axios = require('axios');
const config = require('../config');

let accessToken = null;
let tokenExpiresAt = 0;

/**
 * Get Spotify access token using Client Credentials flow.
 */
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  const { spotifyClientId, spotifyClientSecret } = config;
  if (!spotifyClientId || !spotifyClientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const resp = await axios.post(
    'https://accounts.spotify.com/api/token',
    new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64'),
      },
    }
  );

  accessToken = resp.data.access_token;
  tokenExpiresAt = Date.now() + (resp.data.expires_in - 60) * 1000;
  return accessToken;
}

/**
 * Get Spotify access token using refresh token (Authorization Code flow).
 * This is needed for modifying playlists on a specific user's account.
 */
async function getUserAccessToken() {
  const { spotifyClientId, spotifyClientSecret, spotifyRefreshToken } = config;
  if (!spotifyRefreshToken) {
    throw new Error('Spotify refresh token not configured');
  }

  const resp = await axios.post(
    'https://accounts.spotify.com/api/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: spotifyRefreshToken,
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64'),
      },
    }
  );

  return resp.data.access_token;
}

/**
 * Search for a track on Spotify by name.
 * Returns the first matching track or null.
 */
async function searchTrack(query) {
  const token = await getAccessToken();

  const resp = await axios.get('https://api.spotify.com/v1/search', {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      q: query,
      type: 'track',
      limit: 1,
    },
  });

  const tracks = resp.data.tracks?.items;
  if (!tracks || tracks.length === 0) return null;

  const track = tracks[0];
  return {
    spotify_id: track.id,
    spotify_uri: track.uri,
    name: track.name,
    artist: track.artists.map((a) => a.name).join(', '),
    album: track.album?.name || '',
    cover_url: track.album?.images?.[0]?.url || '',
    preview_url: track.preview_url || '',
    external_url: track.external_urls?.spotify || '',
  };
}

/**
 * Add a track to the Spotify playlist.
 */
async function addTrackToPlaylist(spotifyUri) {
  const { spotifyPlaylistId } = config;
  if (!spotifyPlaylistId) {
    throw new Error('Spotify playlist ID not configured');
  }

  const token = await getUserAccessToken();

  await axios.post(
    `https://api.spotify.com/v1/playlists/${spotifyPlaylistId}/tracks`,
    { uris: [spotifyUri] },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Remove a track from the Spotify playlist.
 */
async function removeTrackFromPlaylist(spotifyUri) {
  const { spotifyPlaylistId } = config;
  if (!spotifyPlaylistId) return;

  const token = await getUserAccessToken();

  await axios.delete(
    `https://api.spotify.com/v1/playlists/${spotifyPlaylistId}/tracks`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        tracks: [{ uri: spotifyUri }],
      },
    }
  );
}

module.exports = {
  searchTrack,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
};
