import { NextRequest } from 'next/server'
import { getAccessTokenFromCookies, getSpotifyProfile, createPlaylist, searchSpotifyTracks, addTracksToPlaylist } from '@/lib'
import { getTrackListFromPrompt } from '@/lib/openai'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    let prompt = ''
    const body = await req.json()
    prompt = body.prompt
    console.log('Received prompt in /api/playlist/build:', prompt)
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Missing prompt' }), { status: 400 })
    }

    const cookieStore = await cookies()
    const token = cookieStore.get('spotify_access_token')?.value || null
    console.log('[build route] Access token:', token ? '[REDACTED]' : 'Not found')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Not authenticated with Spotify' }), { status: 401 })
    }

    let user
    try {
      user = await getSpotifyProfile(token)
      console.log('[build route] Retrieved user profile:', user.display_name || user.id)
    } catch (err) {
      console.error('[build route] Failed to fetch user profile:', err)
      return new Response(JSON.stringify({ error: 'Failed to fetch user profile' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const trackList = await getTrackListFromPrompt(prompt)

    const playlistName = `SpottyG Playlist - ${prompt.slice(0, 32)}`
    const playlist = await createPlaylist(token, playlistName)

    const rawUris = await searchSpotifyTracks(token, trackList.join(', '))
    const trackUris: string[] = rawUris.split(',').map((uri: string) => uri.trim())
    await addTracksToPlaylist(token, playlist.id, trackUris)

    return new Response(JSON.stringify({ playlistUrl: playlist.url, tracks: trackList }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Error in /api/playlist/build:', err)
    return new Response(
      JSON.stringify({ error: `Failed to build playlist${prompt ? ` for prompt: ${prompt}` : ''}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}