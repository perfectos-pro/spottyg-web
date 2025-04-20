export const getSpotifyAccessToken = async (): Promise<string> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/token`)
  const data = await res.json()
  if (!data.token) throw new Error('No Spotify access token provided')
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

export async function addTracksToPlaylist(accessToken: string, playlistId: string, uris: string[]): Promise<any> {
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

  // Step 1: Fetch user profile
  const profileRes = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const profileDebug = await profileRes.text()
  console.log('[createPlaylist] Profile fetch status:', profileRes.status)
  console.log('[createPlaylist] Profile body:', profileDebug)

  if (!profileRes.ok) {
    const err = new Error('Failed to fetch user profile')
    Object.assign(err, { details: profileDebug })
    throw err
  }

  const profile = JSON.parse(profileDebug)
  const spotifyId = profile.id

  // Step 2: Create the playlist
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

  const createDebug = await createRes.text()
  console.log('[createPlaylist] Playlist creation status:', createRes.status)
  console.log('[createPlaylist] Playlist creation response:', createDebug)

  if (!createRes.ok) {
    const err = new Error('Failed to create playlist')
    Object.assign(err, { details: createDebug })
    throw err
  }

  const createData = JSON.parse(createDebug)
  return {
    id: createData.id,
    name: createData.name,
    url: createData.external_urls?.spotify,
  }
}

export async function getSpotifyProfile(accessToken: string): Promise<{ id: string; display_name?: string }> {
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
  const cookieResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/token`)

  if (!cookieResponse.ok) {
    console.warn('[getAccessTokenFromCookies] Failed to fetch token endpoint')
    return null
  }

  const data = await cookieResponse.json()
  console.debug('[getAccessTokenFromCookies] Token response:', data)

  if (data.token) return data.token

  // Attempt to refresh if no token
  const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/token?refresh=true`)
  const refreshData = await refreshResponse.json()

  console.debug('[getAccessTokenFromCookies] Refresh attempt result:', refreshData)

  if (refreshData.token) return refreshData.token

  throw new Error('Unable to retrieve or refresh Spotify access token from cookies.')
}