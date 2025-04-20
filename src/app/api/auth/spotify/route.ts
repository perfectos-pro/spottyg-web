import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(): Promise<NextResponse> {
  // Check for required environment variables
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI

  if (!clientId || !redirectUri) {
    console.warn('Missing required environment variables: SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  // Using the redirect URI registered in Spotify dashboard

  // Generate a random state parameter to prevent CSRF attacks
  // The state parameter is used to verify that the response received 
  // is from the request that was initiated by the user
  const state = crypto.randomBytes(16).toString('hex')

  // Include additional scopes
  const scope = [
    'playlist-modify-private',
    'playlist-modify-public',
    'playlist-read-private', 
    'user-read-email',
    'user-read-private'
  ].join(' ')

  const query = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope,
    state,
    show_dialog: 'true' // Force the user to approve the app again
  })

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${query}`)
}
