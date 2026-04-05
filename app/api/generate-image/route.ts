import { NextRequest, NextResponse } from 'next/server'

async function falRequest(endpoint: string, payload: object, apiKey: string) {
  const submit = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const { request_id } = await submit.json()
  if (!request_id) throw new Error('No request_id from fal.ai')

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 4000))
    const res = await fetch(`https://queue.fal.run/${endpoint}/requests/${request_id}`, {
      headers: { Authorization: `Key ${apiKey}` },
    })
    const data = await res.json()
    if (data.images || data.output) return data
    if (data.status === 'FAILED') throw new Error('Generation failed')
  }
  throw new Error('Timeout')
}

export async function POST(req: NextRequest) {
  const { prompt, modelId, aspect, resolution, referenceUrl } = await req.json()
  const apiKey = req.headers.get('x-fal-key') || process.env.FAL_KEY
  if (!apiKey) return NextResponse.json({ error: 'No fal.ai API key' }, { status: 400 })

  const imageSize = aspect === '1:1' ? 'square_hd' : aspect === '16:9' ? 'landscape_16_9' : aspect === '9:16' ? 'portrait_16_9' : 'square_hd'

  const payload: Record<string, unknown> = { prompt, aspect_ratio: aspect, image_size: imageSize }
  if (resolution) payload.resolution = resolution
  if (referenceUrl) payload.image_url = referenceUrl

  const result = await falRequest(modelId, payload, apiKey)
  const url = result.images?.[0]?.url || result.images?.[0] || result.output?.[0]
  return NextResponse.json({ url })
}
