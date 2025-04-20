'use client'

import { useState, useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'
import { v4 as uuidv4 } from 'uuid'
import type { JSX } from 'react'

export default function Home(): JSX.Element {
  const [messages, setMessages] = useState([
    { id: uuidv4(), role: 'system', content: 'Welcome to SpottyG – your music historian assistant!', timestamp: new Date().toISOString() }
  ])
  const [input, setInput] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const annotationLoadingPhrases = [
    'Combing the archives...',
    'Dusting off the record sleeves...',
    'Consulting the liner notes...',
    'Tuning into forgotten frequencies...',
    'Rewinding through history...'
  ]

  // Check for client-side cookie directly
  useEffect(() => {
    // Check for cookies first
    const hasSpotifyTokenCookie = document.cookie.includes('spotify_access_token=')
    console.log('Client: Cookie check -', hasSpotifyTokenCookie ? 'token cookie found' : 'no token cookie')
  }, [])

  // Check auth status via API
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/me')
        if (response.ok) {
          const userData = await response.json()
          setIsAuthenticated(true)
          setAuthError('')
        } else {
          const errorData = await response.json()
          console.debug('Auth check failed:', errorData)
          setIsAuthenticated(false)
          setAuthError(errorData.error || 'Authentication failed')
        }
      } catch (error) {
        console.debug('Error checking auth status:', error)
        setIsAuthenticated(false)
        setAuthError('Error connecting to server')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthStatus()
  }, [setIsAuthenticated, setAuthError])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!isAuthenticated) return
    const timer = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [isAuthenticated])

  const handleSpotifyLogin = () => {
    window.location.href = '/api/auth/spotify'
  }

  const fetchPlaylist = async (prompt: string) => {
    try {
      const playlistRes = await fetch('/api/playlist/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await playlistRes.json()
      if (data.playlistUrl) {
        setMessages(prev => [...prev, {
          id: uuidv4(),
          role: 'assistant',
          content: `Here's your playlist: <a href="${data.playlistUrl}" target="_blank" rel="noopener noreferrer">${data.playlistUrl}</a>`,
          timestamp: new Date().toISOString(),
        }])
        const placeholderId = uuidv4()
        const phrase = annotationLoadingPhrases[Math.floor(Math.random() * annotationLoadingPhrases.length)]
        setMessages(prev => [...prev, {
          id: placeholderId,
          role: 'assistant',
          content: phrase,
          timestamp: new Date().toISOString(),
        }])
        fetchHistory(prompt, data.tracks, placeholderId)
      } else {
        throw new Error(data.error || 'Playlist creation failed')
      }
    } catch (err) {
      console.error('Playlist fetch failed:', err)
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: 'Error: Unable to create playlist.',
        timestamp: new Date().toISOString()
      }])
    }
  }

  const fetchHistory = async (playlistName: string, tracks: string[], placeholderId: string) => {
    try {
      const historyRes = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistName, tracks }),
      })

      const historyData = await historyRes.json()
      if (historyData.history) {
        setMessages(prev => [...prev, {
          id: uuidv4(),
          role: 'assistant',
          content: DOMPurify.sanitize(historyData.history),
          timestamp: new Date().toISOString(),
        }])
      }
    } catch (err) {
      console.error('Error fetching history:', err)
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: 'Unable to retrieve annotation at this time. Please try again later.',
        timestamp: new Date().toISOString(),
      }])
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return
    const timestamp = new Date().toISOString()
    const id = uuidv4()
    const updated = [...messages, { id, role: 'user', content: input, timestamp }]
    setMessages(prev => [...prev, { id, role: 'user', content: input, timestamp }])
    setInput('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      })

      if (!res.ok || !res.body) {
        const errorText = await res.text()
        throw new Error(`API error: ${errorText}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let result = ''

      const streamId = uuidv4()
      setMessages(prev => [...prev, {
        id: streamId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString()
      }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '))
        for (const line of lines) {
          const json = line.replace(/^data: /, '')
          try {
            const parsed = JSON.parse(json)
            const text = parsed.choices?.[0]?.delta?.content
            if (text) {
              result += text
              setMessages(prev => prev.map(msg =>
                msg.id === streamId ? { ...msg, content: result } : msg
              ))
            }
          } catch (err) {
            console.error('Failed to parse stream chunk:', err)
          }
        }
      }

      fetchPlaylist(input)
    } catch (err) {
      console.error('Error sending message:', err)
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong'
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date().toISOString()
      }])
    }
  }

  if (isLoading) {
    return (
      <main className="bg-background text-foreground min-h-screen container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        <h1 className="text-3xl font-bold mb-4">🎧 SpottyG</h1>
        <div className="text-center py-10">
          <p>Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-background text-foreground min-h-screen container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
      <h1 className="text-3xl font-bold mb-4">🎧 SpottyG</h1>
      
      {!isAuthenticated ? (
        <div className="flex flex-col items-center justify-center py-10">
          <p className="mb-6 text-center">Connect your Spotify account to get started</p>
          {authError && (
            <div
              className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-md"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-sm">Error: {authError}</p>
              <p className="text-xs mt-1">If you've already logged in but experiencing issues, try clearing cookies and trying again.</p>
            </div>
          )}
          <button 
            onClick={handleSpotifyLogin}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-bold flex items-center"
          >
            <span className="mr-2">Login with Spotify</span>
            <svg
              width="24"
              height="24"
              role="img"
              aria-label="Spotify logo"
              xmlns="http://www.w3.org/2000/svg"
              fillRule="evenodd"
              clipRule="evenodd"
              viewBox="0 0 24 24"
            >
              <title>Spotify</title>
              <path fill="currentColor" d="M19.098 10.638c-3.868-2.297-10.248-2.508-13.941-1.387-.593.18-1.22-.155-1.399-.748-.18-.593.154-1.22.748-1.4 4.239-1.287 11.285-1.038 15.738 1.605.533.317.708 1.005.392 1.538-.316.533-1.005.709-1.538.392zm-.126 3.403c-.272.44-.847.578-1.287.308-3.225-1.982-8.142-2.557-11.958-1.399-.494.15-1.017-.129-1.167-.623-.149-.495.13-1.016.624-1.167 4.358-1.322 9.776-.682 13.48 1.595.44.27.578.847.308 1.286zm-1.469 3.267c-.215.354-.676.465-1.028.249-2.818-1.722-6.365-2.111-10.542-1.157-.402.092-.803-.16-.895-.562-.092-.403.159-.804.562-.896 4.571-1.045 8.492-.595 11.655 1.338.353.215.464.676.248 1.028zm-5.503-17.308c-6.627 0-12 5.373-12 12 0 6.628 5.373 12 12 12 6.628 0 12-5.372 12-12 0-6.627-5.372-12-12-12z"/>
            </svg>
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto chat-scroll px-1 pb-4 space-y-4">
            {messages.map((msg, i) => {
              const isLoadingAnnotation = annotationLoadingPhrases.includes(msg.content)
              const bubbleClass = msg.role === 'user'
                ? 'bg-pink-500 text-white rounded-br-none'
                : isLoadingAnnotation
                  ? 'bg-zinc-800 text-zinc-300 italic rounded-bl-none'
                  : 'bg-zinc-800 text-white rounded-bl-none'
              return (
                <div key={msg.id} className={`mb-2 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-xl text-sm ${bubbleClass}`}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(isLoadingAnnotation ? `🤔 ${msg.content}` : msg.content) }}
                  />
                  {msg.timestamp && (
                    <div className="text-xs text-zinc-400 mt-1 ml-2">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 bg-zinc-900 text-white px-4 py-3 rounded-lg border border-neutral-700 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 transition"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              ref={inputRef}
            />
            <button className="bg-pink-600 text-white px-5 py-3 rounded-lg hover:bg-pink-500 transition" onClick={sendMessage}>Send</button>
          </div>
        </>
      )}
    </main>
  )
}