export const getSpotifyAccessToken = async (): Promise<string> => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/token`)
    const data = await res.json()
    return data.token
}

export async function searchSpotifyTracks(query: string, accessToken: string): Promise<any> {
  if (!query) throw new Error('Missing search query')
  if (!accessToken) throw new Error('Missing access token')

  const res = await fetch(`https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(query)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    const err = new Error('Spotify API error')
    Object.assign(err, { details: data })
    throw err
  }

  return data
}

export async function addTracksToPlaylist(playlistId: string, uris: string[], accessToken: string): Promise<any> {
  if (!playlistId) throw new Error('Missing playlist ID')
  if (!uris?.length) throw new Error('No tracks to add')
  if (!accessToken) throw new Error('Missing access token')

  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris }),
  })

  const data = await res.json()
  if (!res.ok) {
    const err = new Error('Failed to add tracks to playlist')
    Object.assign(err, { details: data })
    throw err
  }

  return data
}

export async function createPlaylist(name: string, accessToken: string): Promise<{ id: string; name: string; url: string }> {
  if (!name) throw new Error('Missing playlist name')
  if (!accessToken) throw new Error('Missing access token')

  // Fetch the user's Spotify profile to get their ID
  const profileRes = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!profileRes.ok) {
    throw new Error('Failed to fetch user profile')
  }

  const profile = await profileRes.json()
  const spotifyId = profile.id

  const createRes = await fetch(`https://api.spotify.com/v1/users/${spotifyId}/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description: 'Created by SpottyG',
      public: false,
    }),
  })

  const createData = await createRes.json()

  if (!createRes.ok) {
    const err = new Error('Failed to create playlist')
    Object.assign(err, { details: createData })
    throw err
  }

  return {
    id: createData.id,
    name: createData.name,
    url: createData.external_urls?.spotify,
  }
}

export async function getSpotifyProfile(accessToken: string): Promise<{ id: string }> {
  const profileRes = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!profileRes.ok) {
    throw new Error('Failed to fetch Spotify user profile')
  }

  const profile = await profileRes.json()
  return { id: profile.id }
}

export async function getAccessTokenFromCookies(): Promise<string | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/token`)
  if (!res.ok) return null
  const data = await res.json()
  return data.token || null
}
