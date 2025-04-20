import { NextRequest } from 'next/server'
import { getAccessTokenFromCookies, getSpotifyProfile, createPlaylist, searchSpotifyTracks, addTracksToPlaylist } from '@/lib'
import { getTrackListFromPrompt } from '@/lib/openai'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    console.log('Received prompt in /api/playlist/build:', prompt)
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Missing prompt' }), { status: 400 })
    }

    const cookieStore = await cookies()
    const token = cookieStore.get('spotify_access_token')?.value || null
    if (!token) {
      return new Response(JSON.stringify({ error: 'Not authenticated with Spotify' }), { status: 401 })
    }

    const user = await getSpotifyProfile(token)
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
    return new Response(JSON.stringify({ error: `Failed to build playlist for prompt: ${prompt || 'unknown'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
