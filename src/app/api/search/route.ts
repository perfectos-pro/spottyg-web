import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { searchSpotifyTracks } from '@/lib'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('spotify_access_token')?.value
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'Missing search query (q)' }, { status: 400 })
  }

  try {
    const data = await searchSpotifyTracks(query, accessToken || '')
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 })
  }
}
