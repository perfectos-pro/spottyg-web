import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

export async function GET() {
  console.log('API /me: Request received')
  
  // Get the access token from cookies using the await cookies() function
  const cookieStore = await await cookies()
  const accessToken = cookieStore.get('spotify_access_token')?.value
  
  console.log('API /me: All cookies:', cookieStore.getAll().map(c => c.name))
  console.log('API /me: Access token from cookie:', accessToken ? `found token (starts with: ${accessToken.substring(0, 5)}...)` : 'no token')

  if (!accessToken) {
    return NextResponse.json({ error: 'No access token found in cookies' }, { status: 401 })
  }

  try {
    // First fetch the user profile from Spotify to get the spotifyId
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!profileResponse.ok) {
      console.error('Failed to get Spotify profile:', await profileResponse.text())
      return NextResponse.json({ error: 'Failed to get Spotify profile' }, { status: 500 })
    }

    const profileData = await profileResponse.json()
    console.log('Profile fetch successful:', { 
      id: profileData.id,
      email: profileData.email,
      display_name: profileData.display_name
    })
    
    const spotifyId = profileData.id

    // Then look up the user in our database by spotifyId
    const user = await prisma.user.findUnique({
      where: { spotifyId },
      select: {
        spotifyId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      console.error('No user found in database for spotifyId:', spotifyId)
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    console.log('User found in database:', user)
    return NextResponse.json(user)
  } catch (error) {
    console.error('Error in /api/me route:', error)
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
  }
}
