import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  if (!process.env.SPOTIFY_ACCESS_TOKEN) {
    console.warn("SPOTIFY_ACCESS_TOKEN is not defined");
  }
  return NextResponse.json({ token: process.env.SPOTIFY_ACCESS_TOKEN ?? '' })
}