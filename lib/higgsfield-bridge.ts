// lib/higgsfield-bridge.ts
const EXTENSION_ID = 'fglgnbageacapjnmmikgkegmdhonkmob'

function sendToExtension<T = any>(message: Record<string, any>): Promise<T> {
  return new Promise((resolve, reject) => {
    const chrome = (window as any).chrome
    if (!chrome?.runtime?.sendMessage) {
      reject(new Error('Chrome extension API not available. Install Higgsfield Bridge.')); return
    }
    chrome.runtime.sendMessage(EXTENSION_ID, message, (response: any) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || 'Extension not reachable')); return
      }
      if (!response) { reject(new Error('No response from extension')); return }
      if (response.error) { reject(new Error(response.error)); return }
      resolve(response as T)
    })
  })
}

export async function hfPing(): Promise<boolean> {
  try {
    const r = await sendToExtension<{ ok: boolean }>({ type: 'PING' })
    return !!r.ok
  } catch { return false }
}

export async function hfApiRequest<T = any>(
  url: string, method = 'GET', body?: Record<string, any>
): Promise<T> {
  return sendToExtension<T>({ type: 'API_REQUEST', url, method, body })
}

// ─── Higgsfield API: POST /jobs/{model_type} ───────────────────────────────

async function hfCreateJob(modelType: string, params: Record<string, any>): Promise<any> {
  return hfApiRequest(
    `https://fnf.higgsfield.ai/jobs/${modelType}`,
    'POST',
    { params, use_unlim: false }
  )
}

async function hfGetJob(jobId: string): Promise<any> {
  return hfApiRequest(`https://fnf.higgsfield.ai/jobs/${jobId}`)
}

async function hfPollJob(
  jobSetId: string,
  intervalMs = 4000,
  maxAttempts = 90
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs))
    try {
      const res = await hfGetJob(jobSetId)
      const data = res.data || res
      const jobs = data.jobs || []

      for (const job of jobs) {
        const st = (job.status || '').toLowerCase()
        if (st === 'failed' || st === 'error') {
          throw new Error('Job failed: ' + JSON.stringify(job).slice(0, 300))
        }
        if (st === 'completed' || st === 'done' || st === 'succeeded') {
          return data
        }
      }

      const topSt = (data.status || '').toLowerCase()
      if (topSt === 'completed' || topSt === 'done' || topSt === 'succeeded') return data
      if (topSt === 'failed' || topSt === 'error') {
        throw new Error('Job failed: ' + JSON.stringify(data).slice(0, 300))
      }
    } catch (e: any) {
      if (e.message?.includes('failed') || e.message?.includes('Job failed')) throw e
    }
  }
  throw new Error('Job polling timeout')
}

// ─── Model mapping ──────────────────────────────────────────────────────────

const HF_IMAGE_MAP: Record<string, string> = {
  'fal-ai/nano-banana-pro': 'nano-banana-pro',
  'fal-ai/nano-banana/v2/text-to-image': 'nano-banana-2',
}

const HF_VIDEO_MAP: Record<string, string> = {
  'fal-ai/kling-video/v3/pro/image-to-video': 'kling-3-0',
  'fal-ai/kling-video/v2.5/pro/image-to-video': 'kling-2-5',
  'fal-ai/kling-video/v2.1/pro/image-to-video': 'kling-2-1',
  'fal-ai/wan/v2.5/image-to-video': 'wan-2-5',
  'fal-ai/sora/image-to-video': 'sora',
  'fal-ai/seedance/v2/image-to-video': 'seedance',
  'fal-ai/minimax/hailuo-02/standard/image-to-video': 'hailuo',
  'fal-ai/kling-video/v1.6/pro/image-to-video': 'kling-1-6',
}

export function getHfImageType(falModelId: string): string | null {
  return HF_IMAGE_MAP[falModelId] || null
}

export function getHfVideoType(falModelId: string): string | null {
  return HF_VIDEO_MAP[falModelId] || null
}

export function isHfSupported(falModelId: string): boolean {
  return !!(HF_IMAGE_MAP[falModelId] || HF_VIDEO_MAP[falModelId])
}

// ─── Extract result URLs ────────────────────────────────────────────────────

function extractUrl(data: any, type: 'image' | 'video'): string | null {
  const jobs = data.jobs || []
  for (const job of jobs) {
    if (job.result_url) return job.result_url
    if (job.output_url) return job.output_url
    if (job.url) return job.url
    if (job.output?.url) return job.output.url
    if (job.output?.image_url) return job.output.image_url
    if (job.output?.video_url) return job.output.video_url
    if (job.result?.url) return job.result.url
    if (typeof job.result === 'string' && job.result.startsWith('http')) return job.result
  }
  if (data.result_url) return data.result_url
  if (data.output_url) return data.output_url
  if (data.image_url) return data.image_url
  if (data.video_url) return data.video_url
  if (data.output?.url) return data.output.url
  if (data.video?.url) return data.video.url
  if (data.images?.[0]?.url) return data.images[0].url
  if (data.images?.[0]) return data.images[0]
  return null
}

// ─── Aspect ratio → width/height ────────────────────────────────────────────

const SIZES: Record<string, [number, number]> = {
  '1:1': [1024, 1024],
  '16:9': [1344, 768],
  '9:16': [768, 1344],
  '4:3': [1152, 896],
}

// ─── High-level generation ──────────────────────────────────────────────────

export async function hfGenerateImage(opts: {
  prompt: string
  modelId: string
  aspect?: string
  resolution?: string
  referenceUrl?: string
}): Promise<string> {
  const modelType = getHfImageType(opts.modelId)
  if (!modelType) throw new Error(`Model ${opts.modelId} not supported on Higgsfield`)

  const [w, h] = SIZES[opts.aspect || '1:1'] || [1024, 1024]

  const params: Record<string, any> = {
    prompt: opts.prompt,
    input_images: [],
    width: w,
    height: h,
    aspect_ratio: opts.aspect || '1:1',
    batch_size: 1,
  }
  if (opts.referenceUrl) params.input_images = [opts.referenceUrl]

  const createRes = await hfCreateJob(modelType, params)
  const data = createRes.data || createRes
  const jobSetId = data.id
  if (!jobSetId) throw new Error('No job ID: ' + JSON.stringify(data).slice(0, 300))

  const result = await hfPollJob(jobSetId)
  const url = extractUrl(result, 'image')
  if (!url) throw new Error('No image URL in result: ' + JSON.stringify(result).slice(0, 500))
  return url
}

export async function hfGenerateVideo(opts: {
  imageUrl: string
  modelId: string
  prompt?: string
  duration?: number
}): Promise<string> {
  const modelType = getHfVideoType(opts.modelId)
  if (!modelType) throw new Error(`Model ${opts.modelId} not supported on Higgsfield`)

  const params: Record<string, any> = {
    input_images: [opts.imageUrl],
  }
  if (opts.prompt) params.prompt = opts.prompt
  if (opts.duration) params.duration = opts.duration

  const createRes = await hfCreateJob(modelType, params)
  const data = createRes.data || createRes
  const jobSetId = data.id
  if (!jobSetId) throw new Error('No job ID: ' + JSON.stringify(data).slice(0, 300))

  const result = await hfPollJob(jobSetId, 5000, 90)
  const url = extractUrl(result, 'video')
  if (!url) throw new Error('No video URL in result: ' + JSON.stringify(result).slice(0, 500))
  return url
}

export async function hfLipsync(opts: {
  imageUrl: string
  audioBase64: string
}): Promise<string> {
  const params: Record<string, any> = {
    input_images: [opts.imageUrl],
    audio_data: opts.audioBase64,
  }

  const createRes = await hfCreateJob('dubbing-lipsync', params)
  const data = createRes.data || createRes
  const jobSetId = data.id
  if (!jobSetId) throw new Error('No job ID: ' + JSON.stringify(data).slice(0, 300))

  const result = await hfPollJob(jobSetId, 5000, 90)
  const url = extractUrl(result, 'video')
  if (!url) throw new Error('No lipsync URL in result: ' + JSON.stringify(result).slice(0, 500))
  return url
}
