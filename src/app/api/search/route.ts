import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { searchSpotifyTracks } from '@/lib/spotify'

export async function GET(req: NextRequest) {
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message, details: err.details || null }, { status: 500 })
  }
}
