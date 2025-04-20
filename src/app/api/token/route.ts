import { NextResponse } from 'next/server'

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const shouldRefresh = searchParams.get('refresh') === 'true'

  if (shouldRefresh) {
    console.warn('[token route] Refresh request received, but refresh logic is not implemented.')
    return NextResponse.json({ token: null, error: 'Refresh not implemented' }, { status: 501 })
  }

  if (!process.env.SPOTIFY_ACCESS_TOKEN) {
    console.warn('[token route] SPOTIFY_ACCESS_TOKEN is not defined')
  }

  return NextResponse.json({ token: process.env.SPOTIFY_ACCESS_TOKEN ?? '' })
}