import { OpenAI } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { messages } = await req.json()
    const reply = await OpenAI.chat(messages)
    return NextResponse.json({ reply })
  } catch (err) {
    console.debug('GPT error:', err)
    return NextResponse.json({ reply: 'Sorry, something went wrong.' }, { status: 500 })
  }
}