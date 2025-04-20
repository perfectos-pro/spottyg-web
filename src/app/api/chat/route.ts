import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { searchSpotifyTracks, createSpotifyPlaylist, addTracksToPlaylist } from '@/lib/spotify'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('spotify_access_token')?.value
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized – no access token found' }, { status: 401 })
    }

    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-1106-preview',
        messages,
      }),
    })

    const result = await completion.json()
    const assistantMessage = result.choices?.[0]?.message?.content || 'Sorry, I didn’t understand that.'

    const userPrompt = messages?.find(m => m.role === 'user')?.content || ''

    const functionCallRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-1106-preview',
        messages,
        functions: [
          {
            name: 'createPlaylist',
            description: 'Extract playlist creation details',
            parameters: {
              type: 'object',
              properties: {
                playlist_name: { type: 'string', description: 'Name of the playlist' },
                theme: { type: 'string', description: 'Musical or conceptual theme' },
                track_list: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of desired tracks in the format "Track Name - Artist Name"',
                },
              },
              required: ['theme'],
            },
          },
        ],
        function_call: { name: 'createPlaylist' },
      }),
    })

    const functionCallJson = await functionCallRes.json()
    const parsed = functionCallJson.choices?.[0]?.message?.function_call?.arguments
    const { playlist_name, theme, track_list } = parsed ? JSON.parse(parsed) : {}
    const playlistName = playlist_name || 'SpottyG Playlist';

    // Use OpenAI to generate track list ideas
    const gptTrackRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-1106-preview',
        messages: [
          { role: 'system', content: 'You are a music historian and expert playlist curator.' },
          { role: 'user', content: `Generate a list of 10 Spotify-searchable tracks based on the following theme: ${userPrompt}. Format as "Track Name - Artist Name"` },
        ],
      }),
    })

    const gptTrackJson = await gptTrackRes.json()
    const trackLines = gptTrackJson.choices?.[0]?.message?.content?.split('\n') || []
    const parsedTracks = trackLines
      .map((line: string) => {
        const match = line.match(/^\d*\.?\s*"?(.*?)"?\s+-\s+(.*)/)
        if (match) return `${match[1].trim()} ${match[2].trim()}`
        return null
      })
      .filter(Boolean)

    console.log('Parsed tracks from OpenAI:', parsedTracks)

    // Search Spotify for track URIs
    const uris: string[] = []
    for (const query of parsedTracks.slice(0, 10)) {
      try {
        const data = await searchSpotifyTracks(query, accessToken)
        const track = data.tracks?.items?.[0]
        if (track) uris.push(track.uri)
      } catch (err) {
        console.error(`Track search failed for: ${query}`, err)
      }
    }

    console.log('Spotify URIs:', uris)

    const createJson = await createSpotifyPlaylist(playlistName, accessToken)
    console.log('Playlist created:', createJson)

    // Step 2: Add tracks to the playlist
    const addJson = await addTracksToPlaylist(createJson.id, uris, accessToken)
    console.log('Tracks added:', addJson)

    // Use OpenAI to generate historical context based on the track list
    const trackListForPrompt = parsedTracks.slice(0, 10).join(', ')
    const historyRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-1106-preview',
        messages: [
          { role: 'system', content: 'You are a music historian and playlist curator.' },
          {
            role: 'user',
            content: `Provide a 2-3 paragraph annotation with historical and cultural context for a playlist titled "${playlistName}". The playlist includes the following tracks: ${trackListForPrompt}`,
          },
        ],
      }),
    })
    const historyJson = await historyRes.json()
    const historyText = historyJson.choices?.[0]?.message?.content || ''

    return NextResponse.json({
      reply: `Created playlist: <a href="${createJson.url}" target="_blank" rel="noopener noreferrer">${createJson.name}</a><br><br>${historyText.replace(/\n/g, '<br>')}`,
    });
    
    // 2. Detect track search
    const searchMatch = userPrompt.match(/(?:find|search for)\s(.+)/i)
    if (searchMatch) {
      const query = searchMatch[1]
      const searchRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include'
      })
      const searchData = await searchRes.json()

      const tracks = searchData.tracks?.items?.slice(0, 3) || []
      const formattedTracks = tracks.map((t: any) => `- ${t.name} by ${t.artists?.map((a: any) => a.name).join(', ')}`).join('\n')

      return NextResponse.json({
        reply: assistantMessage,
        searchResults: formattedTracks ? `Here are some tracks I found:\n${formattedTracks}` : 'No tracks found.',
      })
    }

    return NextResponse.json({ reply: assistantMessage })
  } catch (err) {
    console.error('Error in /api/chat:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
