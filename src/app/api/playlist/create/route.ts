import { createSpotifyPlaylist } from '@/lib/spotify'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('spotify_access_token')?.value
    const { name } = await req.json()

    const playlist = await createSpotifyPlaylist(name, accessToken || '')
    return NextResponse.json(playlist)
  } catch (error: any) {
    return NextResponse.json({ error: error.message, details: error.details || null }, { status: 500 })
  }
}
