import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest): NextResponse {
  // Clone the request headers
  const requestHeaders = new Headers(request.headers)
  
  // Check for Spotify access token cookie
  const hasSpotifyAuth = request.cookies.has('spotify_access_token')
  
  // Add X-Spotify-Auth header to request for easier auth checks in routes
  requestHeaders.set('X-Spotify-Auth', hasSpotifyAuth ? 'true' : 'false')
  
  // Log cookie presence for debugging
  if (request.nextUrl.pathname.startsWith('/api')) {
    console.debug('Middleware: Processing', request.nextUrl.pathname)
    console.debug('Middleware: Auth cookies present:', 
      hasSpotifyAuth ? 'yes' : 'no', 
      'Cookies:', request.cookies.getAll().map(c => c.name).join(', ')
    )
  }

  // Continue to the requested resource
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    // Match all API routes and root
    '/api/:path*',
    '/'
  ],
}