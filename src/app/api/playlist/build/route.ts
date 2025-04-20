import { NextRequest } from 'next/server'
import { getAccessTokenFromCookies, getSpotifyProfile } from '@/lib/spotify'
import { createPlaylist, searchSpotifyTracks, addTracksToPlaylist } from '@/lib/spotify'
import { getTrackListFromPrompt } from '@/lib/openai'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    console.log('Received prompt in /api/playlist/build:', prompt)
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Missing prompt' }), { status: 400 })
    }

    const token = await getAccessTokenFromCookies()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Not authenticated with Spotify' }), { status: 401 })
    }

    const user = await getSpotifyProfile(token)
    const trackList = await getTrackListFromPrompt(prompt)

    const playlistName = `SpottyG Playlist - ${prompt.slice(0, 32)}`
    const playlist = await createPlaylist(token, user.id, playlistName)

    const trackUris = await searchSpotifyTracks(trackList, token)
    await addTracksToPlaylist(token, playlist.id, trackUris)

    return new Response(JSON.stringify({ playlistUrl: playlist.external_urls.spotify, tracks: trackList }), {
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
