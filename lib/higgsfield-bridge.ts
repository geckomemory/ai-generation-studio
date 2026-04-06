// lib/higgsfield-bridge.ts
// Client for communicating with Higgsfield Bridge chrome extension

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

export async function hfGetToken(): Promise<string | null> {
  try {
    const r = await sendToExtension<{ token: string }>({ type: 'GET_TOKEN' })
    return r.token || null
  } catch { return null }
}

export async function hfApiRequest<T = any>(
  url: string, method = 'GET', body?: Record<string, any>
): Promise<T> {
  return sendToExtension<T>({ type: 'API_REQUEST', url, method, body })
}

// ─── Higgsfield job helpers ─────────────────────────────────────────────────

export async function hfCreateJob(body: Record<string, any>): Promise<any> {
  const res = await hfApiRequest('https://fnf.higgsfield.ai/jobs', 'POST', body)
  return res
}

export async function hfGetJobStatus(jobId: string): Promise<any> {
  return hfApiRequest(`https://fnf.higgsfield.ai/jobs/${jobId}/status`)
}

export async function hfPollJob(
  jobId: string,
  onProgress?: (data: any) => void,
  intervalMs = 4000,
  maxAttempts = 90
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs))
    const res = await hfGetJobStatus(jobId)
    const data = res.data || res
    onProgress?.(data)
    const st = data.status?.toLowerCase?.() || ''
    if (st === 'completed' || st === 'done' || st === 'succeeded' || data.output_url || data.video_url) {
      return data
    }
    if (st === 'failed' || st === 'error') {
      throw new Error('Job failed: ' + (data.error || JSON.stringify(data).slice(0, 200)))
    }
  }
  throw new Error('Job polling timeout')
}

// ─── Model mapping: fal.ai model ID → Higgsfield job_set_type ──────────────

const HF_IMAGE_MAP: Record<string, string> = {
  'fal-ai/nano-banana-pro': 'nano-banana-pro',
  'fal-ai/nano-banana/v2/text-to-image': 'nano-banana-2',
}

const HF_VIDEO_MAP: Record<string, string> = {
  'fal-ai/kling-video/v3/pro/image-to-video': 'kling3_0',
  'fal-ai/kling-video/v2.5/pro/image-to-video': 'kling2_5',
  'fal-ai/kling-video/v2.1/pro/image-to-video': 'kling2_1',
  'fal-ai/wan/v2.5/image-to-video': 'wan_2_5',
  'fal-ai/sora/image-to-video': 'sora',
  'fal-ai/seedance/v2/image-to-video': 'seedance',
  'fal-ai/minimax/hailuo-02/standard/image-to-video': 'hailuo',
  'fal-ai/kling-video/v1.6/pro/image-to-video': 'kling1_6',
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

// ─── High-level generation functions ────────────────────────────────────────

export async function hfGenerateImage(opts: {
  prompt: string
  modelId: string
  aspect?: string
  resolution?: string
  referenceUrl?: string
}): Promise<string> {
  const jobType = getHfImageType(opts.modelId)
  if (!jobType) throw new Error(`Model ${opts.modelId} not supported on Higgsfield`)

  const body: Record<string, any> = {
    job_set_type: jobType,
    prompt: opts.prompt,
  }
  if (opts.aspect) body.aspect_ratio = opts.aspect
  if (opts.resolution) body.resolution = opts.resolution
  if (opts.referenceUrl) body.image_url = opts.referenceUrl

  const createRes = await hfCreateJob(body)
  const data = createRes.data || createRes
  const jobId = data.id || data.job_id || data.jobId
  if (!jobId) throw new Error('No job ID: ' + JSON.stringify(data).slice(0, 300))

  const result = await hfPollJob(jobId)
  const url = result.output_url || result.image_url || result.output?.url
    || result.images?.[0]?.url || result.images?.[0]
    || result.result?.url || result.result?.image_url
  if (!url) throw new Error('No image URL in result: ' + JSON.stringify(result).slice(0, 300))
  return url
}

export async function hfGenerateVideo(opts: {
  imageUrl: string
  modelId: string
  prompt?: string
  duration?: number
}): Promise<string> {
  const jobType = getHfVideoType(opts.modelId)
  if (!jobType) throw new Error(`Model ${opts.modelId} not supported on Higgsfield`)

  const body: Record<string, any> = {
    job_set_type: jobType,
    image_url: opts.imageUrl,
  }
  if (opts.prompt) body.prompt = opts.prompt
  if (opts.duration) body.duration = opts.duration

  const createRes = await hfCreateJob(body)
  const data = createRes.data || createRes
  const jobId = data.id || data.job_id || data.jobId
  if (!jobId) throw new Error('No job ID: ' + JSON.stringify(data).slice(0, 300))

  const result = await hfPollJob(jobId, undefined, 5000, 90)
  const url = result.output_url || result.video_url || result.output?.url
    || result.video?.url || result.result?.url || result.result?.video_url
  if (!url) throw new Error('No video URL in result: ' + JSON.stringify(result).slice(0, 300))
  return url
}

export async function hfLipsync(opts: {
  imageUrl: string
  audioBase64: string
}): Promise<string> {
  const body: Record<string, any> = {
    job_set_type: 'dubbing_lipsync',
    image_url: opts.imageUrl,
    audio_data: opts.audioBase64,
  }

  const createRes = await hfCreateJob(body)
  const data = createRes.data || createRes
  const jobId = data.id || data.job_id || data.jobId
  if (!jobId) throw new Error('No job ID: ' + JSON.stringify(data).slice(0, 300))

  const result = await hfPollJob(jobId, undefined, 5000, 90)
  const url = result.output_url || result.video_url || result.output?.url
    || result.video?.url || result.result?.url
  if (!url) throw new Error('No lipsync URL in result: ' + JSON.stringify(result).slice(0, 300))
  return url
}
