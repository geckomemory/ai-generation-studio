import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { text, voiceId, modelId } = await req.json()
  const apiKey = req.headers.get('x-el-key') || process.env.ELEVENLABS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No ElevenLabs API key' }, { status: 400 })

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId || 'JBFqnCBsd6RMkjVDRZzb'}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: modelId || 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const buffer = await res.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  return NextResponse.json({ audio: `data:audio/mpeg;base64,${base64}` })
}
