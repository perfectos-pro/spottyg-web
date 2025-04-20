import { NextRequest } from 'next/server'

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { playlistName, tracks } = await req.json()

    const messages = [
      {
        role: 'system',
        content: 'You are a music historian. Provide concise, culturally insightful annotations about music playlists.',
      },
      {
        role: 'user',
        content: `Create a 2-3 paragraph annotation with historical and cultural context for a playlist titled "${playlistName}". The playlist includes the following tracks:\n\n${tracks.join('\n')}`,
      },
    ]

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    let res: Response
    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4-1106-preview',
          messages,
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) {
      const fallback = await res.text()
      console.error('OpenAI error:', fallback)
      return new Response(JSON.stringify({ error: 'OpenAI failed to respond properly' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()
    const history = data.choices?.[0]?.message?.content || ''

    return new Response(JSON.stringify({ history }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error in /api/history:', err)
    } else {
      console.error('Error in /api/history:', err instanceof Error ? err.message : 'Unknown error')
    }
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}