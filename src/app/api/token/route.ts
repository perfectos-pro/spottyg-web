import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ token: process.env.SPOTIFY_ACCESS_TOKEN ?? '' })
}