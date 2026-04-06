import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = (modelName: string, count: number, aspect: string) =>
  `You are an expert image prompt engineer for AI image models (${modelName}). Create ${count} diverse, detailed English prompts. Return ONLY valid JSON array, no markdown:\n[{"prompt":"...","variation":"название на русском 3-5 слов"}]\nAspect ratio: ${aspect}. Make each prompt unique: vary pose, angle, lighting, mood.`

const USER_PROMPT = (task: string, count: number) =>
  `Task: ${task}\n\nGenerate ${count} diverse prompts. JSON only.`

async function generateWithClaude(apiKey: string, task: string, count: number, aspect: string, modelName: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM_PROMPT(modelName, count, aspect),
      messages: [{ role: 'user', content: USER_PROMPT(task, count) }],
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
  return data.content?.map((c: any) => c.type === 'text' ? c.text : '').join('') || ''
}

async function generateWithGemini(apiKey: string, task: string, count: number, aspect: string, modelName: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYSTEM_PROMPT(modelName, count, aspect) + '\n\n' + USER_PROMPT(task, count) }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 2000 },
      }),
    }
  )
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

export async function POST(req: NextRequest) {
  const { task, count, aspect, modelName } = await req.json()
  const claudeKey = req.headers.get('x-anthropic-key') || process.env.ANTHROPIC_API_KEY || ''
  const geminiKey = req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY || ''

  if (!claudeKey && !geminiKey) {
    return NextResponse.json({ error: 'No API key. Add Claude or Gemini key.' }, { status: 400 })
  }

  try {
    const text = claudeKey
      ? await generateWithClaude(claudeKey, task, count, aspect, modelName)
      : await generateWithGemini(geminiKey, task, count, aspect, modelName)

    const clean = text.replace(/```json|```/g, '').trim()
    const prompts = JSON.parse(clean)
    return NextResponse.json({ prompts })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Generation failed' }, { status: 500 })
  }
}
