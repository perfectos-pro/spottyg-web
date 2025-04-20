type ChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export const OpenAI = {
  chat: async (messages: ChatMessage[]): Promise<string> => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages,
      }),
    })

    const json = await response.json()
    return json.choices?.[0]?.message?.content || 'Something went wrong.'
  }
}

export async function getTrackListFromPrompt(prompt: string): Promise<string[]> {
  const systemPrompt = `You're a music historian. Given a prompt, generate a list of 10 specific track titles and artists as a string array. Omit commentary. Output format: ["Track Name - Artist", ...]`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  })

  const json = await response.json()
  try {
    const raw = json.choices?.[0]?.message?.content || ''
    return JSON.parse(raw)
  } catch {
    return []
  }
}