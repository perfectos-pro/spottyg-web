import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Ensure required environment variables are defined
  if (!process.env.SPOTIFY_REDIRECT_URI) {
    throw new Error("Missing SPOTIFY_REDIRECT_URI environment variable");
  }
  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_BASE_URL environment variable");
  }
  try {
    const code = request.nextUrl.searchParams.get("code")

    if (!code) {
      console.error("No authorization code received from Spotify")
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?error=no_code`)
    }

    console.debug("Exchanging code for tokens...")
    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error("Spotify token exchange error:", errorData)
      return NextResponse.json({ error: "Failed to exchange code for tokens" }, { status: 500 })
    }

    const tokenData = await tokenResponse.json()
    console.debug("Spotify token response:", tokenData)
    const { access_token, refresh_token, expires_in } = tokenData

    // Get user profile from Spotify
    console.debug("Fetching Spotify profile...")
    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        "Authorization": `Bearer ${access_token}`,
      },
    })

    if (!profileResponse.ok) {
      console.error("Failed to get Spotify profile:", await profileResponse.text())
      return NextResponse.json({ error: "Failed to get Spotify profile" }, { status: 500 })
    }

    const profileData = await profileResponse.json()
    const spotifyId = profileData.id

    // Create or update user in database
    console.debug("Updating user in database...")
    await prisma.user.upsert({
      where: { spotifyId },
      create: { spotifyId },
      update: {},
    })

    // Create redirect response with cookies
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/`)
    const isProduction = process.env.NODE_ENV === "production"
    
    // Set access token cookie
    response.cookies.set("spotify_access_token", access_token, {
      httpOnly: false,
      path: "/",
      maxAge: expires_in,
      secure: isProduction || request.nextUrl.origin === "http://127.0.0.1:3000",
      sameSite: "lax",
    })
    
    // Set refresh token cookie
    response.cookies.set("spotify_refresh_token", refresh_token, {
      httpOnly: true,
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      secure: isProduction || request.nextUrl.origin === "http://127.0.0.1:3000",
      sameSite: "lax",
    })

    console.debug("Auth successful, redirecting to homepage")
    return response
    
  } catch (error) {
    console.error("Auth callback error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
