import { createPlaylist } from '@/lib'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('spotify_access_token')?.value
    const { name } = await req.json()

    const playlist = await createPlaylist(name, accessToken || '')
    return NextResponse.json(playlist)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message, details: (error as any).details || null }, { status: 500 })
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 })
  }
}
