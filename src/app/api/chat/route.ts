import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { searchSpotifyTracks, createPlaylist, addTracksToPlaylist } from '@/lib'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { messages } = await req.json()
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('spotify_access_token')?.value
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized – no access token found' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
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
        stream: true,
      }),
    })

    if (!completion.ok || !completion.body) {
      const errorText = await completion.text()
      console.error('OpenAI stream error:', errorText)
      return new Response(JSON.stringify({ error: 'Failed to stream OpenAI response' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder()
        const reader = completion.body!.getReader()

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
          }
        } catch (err) {
          console.error('Error during OpenAI stream forwarding:', err)
          controller.error(err)
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('Error in /api/chat:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
