import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { task, count, aspect, modelName } = await req.json()
  const apiKey = req.headers.get('x-anthropic-key') || process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No Anthropic API key' }, { status: 400 })

  const client = new Anthropic({ apiKey })
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: `You are an expert image prompt engineer for AI image models (${modelName}). Create ${count} diverse, detailed English prompts. Return ONLY valid JSON array, no markdown:\n[{"prompt":"...","variation":"название на русском 3-5 слов"}]\nAspect ratio: ${aspect}. Make each prompt unique: vary pose, angle, lighting, mood. Be specific and detailed.`,
    messages: [{ role: 'user', content: `Task: ${task}\n\nGenerate ${count} diverse prompts. JSON only.` }],
  })

  const text = msg.content.map((c: { type: string; text?: string }) => c.type === 'text' ? c.text : '').join('')
  const clean = text.replace(/```json|```/g, '').trim()
  const prompts = JSON.parse(clean)
  return NextResponse.json({ prompts })
}
