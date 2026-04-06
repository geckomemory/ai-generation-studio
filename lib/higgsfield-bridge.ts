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

// ─── Higgsfield API helpers ─────────────────────────────────────────────────

// Real API format: POST /jobs/{model_type} with { params: {...}, use_unlim: false }

async function hfCreateJob(modelType: string, params: Record<string, any>): Promise<any> {
  const res = await hfApiRequest(
    `https://fnf.higgsfield.ai/jobs/${modelType}`,
    'POST',
    { params, use_unlim: false }
  )
  return res
}

async function hfGetJob(jobId: string): Promise<any> {
  return hfApiRequest(`https://fnf.higgsfield.ai/jobs/${jobId}`)
}

async function hfGetJobStatus(jobId: string): Promise<any> {
  return hfApiRequest(`https://fnf.higgsfield.ai/jobs/${jobId}/status`)
}

async function hfPollJob(
  jobId: string,
  onProgress?: (data: any) => void,
  intervalMs = 4000,
  maxAttempts = 90
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs))
    try {
      const res = await hfGetJob(jobId)
      const data = res.data || res
      onProgress?.(data)

      // Check if jobs array has completed items with output
      const jobs = data.jobs || []
      for (const job of jobs) {
        if (job.status === 'completed' || job.status === 'done' || job.status === 'succeeded') {
          if (job.output_url || job.result_url || job.url) {
            return data
          }
        }
        if (job.output && (job.output.url || job.output.image_url || job.output.video_url)) {
          return data
        }
      }

      // Check top-level status
      const st = (data.status || '').toLowerCase()
      if (st === 'completed' || st === 'done' || st === 'succeeded') return data
      if (st === 'failed' || st === 'error') {
        throw new Error('Job failed: ' + (data.error || JSON.stringify(data).slice(0, 300)))
      }

      // Check if result images/videos exist
      if (data.result_url || data.output_url || data.image_url || data.video_url) return data
    } catch (e: any) {
      // 404 or similar might mean job not ready yet, keep polling
      if (e.message?.includes('failed') || e.message?.includes('error')) throw e
    }
  }
  throw new Error('Job polling timeout')
}

// ─── Model mapping: fal.ai model ID → Higgsfield URL path ──────────────────

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

// ─── Extract result URL from job data ───────────────────────────────────────

function extractImageUrl(data: any): string | null {
  // Check jobs array first
  const jobs = data.jobs || []
  for (const job of jobs) {
    if (job.result_url) return job.result_url
    if (job.output_url) return job.output_url
    if (job.url) return job.url
    if (job.output?.url) return job.output.url
    if (job.output?.image_url) return job.output.image_url
    if (job.result?.url) return job.result.url
    // Sometimes result is in job.result as a string URL
    if (typeof job.result === 'string' && job.result.startsWith('http')) return job.result
  }
  // Check top-level
  if (data.result_url) return data.result_url
  if (data.output_url) return data.output_url
  if (data.image_url) return data.image_url
  if (data.output?.url) return data.output.url
  if (data.images?.[0]?.url) return data.images[0].url
  if (data.images?.[0]) return data.images[0]
  return null
}

function extractVideoUrl(data: any): string | null {
  const jobs = data.jobs || []
  for (const job of jobs) {
    if (job.result_url) return job.result_url
    if (job.output_url) return job.output_url
    if (job.url) return job.url
    if (job.output?.url) return job.output.url
    if (job.output?.video_url) return job.output.video_url
    if (job.result?.url) return job.result.url
    if (typeof job.result === 'string' && job.result.startsWith('http')) return job.result
  }
  if (data.result_url) return data.result_url
  if (data.output_url) return data.output_url
  if (data.video_url) return data.video_url
  if (data.video?.url) return data.video.url
  if (data.output?.url) return data.output.url
  return null
}

// ─── High-level generation functions ────────────────────────────────────────

export async function hfGenerateImage(opts: {
  prompt: string
  modelId: string
  aspect?: string
  resolution?: string
  referenceUrl?: string
}): Promise<string> {
  const modelType = getHfImageType(opts.modelId)
  if (!modelType) throw new Error(`Model ${opts.modelId} not supported on Higgsfield`)

  const params: Record<string, any> = {
    prompt: opts.prompt,
    input_images: [],
  }
  if (opts.aspect) params.aspect_ratio = opts.aspect
  if (opts.referenceUrl) params.input_images = [opts.referenceUrl]

  const createRes = await hfCreateJob(modelType, params)
  const data = createRes.data || createRes

  // Get the job set ID and sub-job ID
  const jobSetId = data.id
  const subJobId = data.jobs?.[0]?.id
  const pollId = subJobId || jobSetId

  if (!pollId) throw new Error('No job ID: ' + JSON.stringify(data).slice(0, 300))

  const result = await hfPollJob(jobSetId)
  const url = extractImageUrl(result)
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

  const result = await hfPollJob(jobSetId, undefined, 5000, 90)
  const url = extractVideoUrl(result)
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

  const result = await hfPollJob(jobSetId, undefined, 5000, 90)
  const url = extractVideoUrl(result)
  if (!url) throw new Error('No lipsync URL in result: ' + JSON.stringify(result).slice(0, 500))
  return url
}
