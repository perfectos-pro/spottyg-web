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