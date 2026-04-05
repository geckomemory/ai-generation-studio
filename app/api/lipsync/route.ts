import { NextRequest, NextResponse } from 'next/server'

async function falRequest(endpoint: string, payload: object, apiKey: string) {
  const submit = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const { request_id } = await submit.json()
  if (!request_id) throw new Error('No request_id')

  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const res = await fetch(`https://queue.fal.run/${endpoint}/requests/${request_id}`, {
      headers: { Authorization: `Key ${apiKey}` },
    })
    const data = await res.json()
    if (data.video || data.output) return data
    if (data.status === 'FAILED') throw new Error('Lipsync failed')
  }
  throw new Error('Timeout')
}

export async function POST(req: NextRequest) {
  const { imageUrl, audioBase64, prompt } = await req.json()
  const apiKey = req.headers.get('x-fal-key') || process.env.FAL_KEY
  if (!apiKey) return NextResponse.json({ error: 'No fal.ai API key' }, { status: 400 })

  const result = await falRequest('fal-ai/kling-video/v2.1/standard/lip-sync', {
    image_url: imageUrl,
    audio_url: audioBase64,
    prompt: prompt || '',
  }, apiKey)

  const url = result.video?.url || result.output?.[0]
  return NextResponse.json({ url })
}

export const maxDuration = 300
