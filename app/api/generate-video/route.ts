import { NextRequest, NextResponse } from 'next/server'

async function falRequest(endpoint: string, payload: object, apiKey: string) {
  const submit = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await submit.json()
  const request_id = data.request_id
  if (!request_id) throw new Error('No request_id: ' + JSON.stringify(data).slice(0, 200))

  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const res = await fetch(`https://queue.fal.run/${endpoint}/requests/${request_id}`, {
      headers: { Authorization: `Key ${apiKey}` },
    })
    const result = await res.json()
    if (result.video || result.output) return result
    if (result.status === 'FAILED') throw new Error('Video generation failed')
  }
  throw new Error('Timeout')
}

export async function POST(req: NextRequest) {
  const { imageUrl, modelId, prompt, duration } = await req.json()
  const apiKey = req.headers.get('x-fal-key') || process.env.FAL_KEY
  if (!apiKey) return NextResponse.json({ error: 'No fal.ai API key' }, { status: 400 })

  const payload: Record<string, unknown> = { image_url: imageUrl, prompt, duration: duration || 5 }
  const result = await falRequest(modelId, payload, apiKey)
  const url = result.video?.url || result.output?.[0]
  return NextResponse.json({ url })
}

export const maxDuration = 300
