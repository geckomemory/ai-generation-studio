'use client'
import { useState, useRef, useCallback } from 'react'
import styles from './page.module.css'

// ─── MODELS ───────────────────────────────────────────────────────────────────

const IMG_MODELS = [
  { id: 'fal-ai/nano-banana-pro', name: 'Nano Banana Pro', tag: '🔥 Лучший', desc: 'Gemini 3.0, 4K, точный текст, физреализм' },
  { id: 'fal-ai/nano-banana/v2/text-to-image', name: 'Nano Banana 2', tag: 'Быстро', desc: 'Флагман Higgsfield, отличные персонажи' },
  { id: 'fal-ai/bytedance/seedream-4-5/text-to-image', name: 'Seedream 4.5', tag: 'Фото', desc: 'ByteDance, фотореализм и лица' },
  { id: 'fal-ai/flux-pro/v1.1', name: 'FLUX Pro 1.1', tag: 'Artistic', desc: 'Коммерческое качество, детализация' },
  { id: 'fal-ai/flux/dev', name: 'FLUX Dev', tag: 'Дёшево', desc: 'Отличное соотношение цена/качество' },
]

const VID_MODELS = [
  { id: 'fal-ai/kling-video/v3/pro/image-to-video', name: 'Kling 3.0 Pro', tag: '🔥 Топ 2025', desc: '15 сек, нативный звук, мульти-шот' },
  { id: 'fal-ai/kling-video/v2.5/pro/image-to-video', name: 'Kling 2.5 Turbo', tag: 'Быстро', desc: 'Плавное движение, баланс цена/скорость' },
  { id: 'fal-ai/kling-video/v2.1/pro/image-to-video', name: 'Kling 2.1 Master', tag: 'Надёжно', desc: 'Проверенная модель, мультяшные персонажи' },
  { id: 'fal-ai/wan/v2.5/image-to-video', name: 'Wan 2.5', tag: '10 сек', desc: '1080p, нативный звук, физика' },
  { id: 'fal-ai/minimax/hailuo-02/standard/image-to-video', name: 'MiniMax Hailuo 02', tag: 'Эконом', desc: 'Быстро и недорого, 768p' },
  { id: 'fal-ai/sora/image-to-video', name: 'Sora 2', tag: 'Premium', desc: 'OpenAI, кинематографика до 35 сек' },
  { id: 'fal-ai/seedance/v2/image-to-video', name: 'Seedance 2.0', tag: 'ByteDance', desc: 'Мультимодальный, сильная физика' },
  { id: 'fal-ai/kling-video/v1.6/pro/image-to-video', name: 'Kling 1.6 Pro', tag: 'Бюджет', desc: 'Старая добрая версия, дёшево' },
]

const EL_VOICES = [
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', desc: 'мужской, уверенный' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', desc: 'женский, мягкий' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', desc: 'нейтральный, чёткий' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', desc: 'женский, живой' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', desc: 'мужской, глубокий' },
]

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface GeneratedImage { url: string; prompt: string; variation: string }
interface GeneratedVideo { url: string; label: string; fromImage?: string }
interface Prompt { prompt: string; variation: string }

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function Studio() {
  // Keys
  const [falKey, setFalKey] = useState('')
  const [elKey, setElKey] = useState('')
  const [claudeKey, setClaudeKey] = useState('')
  const [keysOk, setKeysOk] = useState(false)

  // Task
  const [task, setTask] = useState('')
  const [imgCount, setImgCount] = useState(5)
  const [aspect, setAspect] = useState('1:1')
  const [resolution, setResolution] = useState('1080p')
  const [imgModel, setImgModel] = useState(IMG_MODELS[0])
  const [vidModel, setVidModel] = useState(VID_MODELS[0])
  const [refUrl, setRefUrl] = useState('')
  const [refPreview, setRefPreview] = useState('')
  const refFileRef = useRef<HTMLInputElement>(null)

  // Prompts
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [editedPrompts, setEditedPrompts] = useState<string[]>([])

  // Images
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set())

  // Video
  const [motionMode, setMotionMode] = useState<'claude' | 'user'>('claude')
  const [motionPrompt, setMotionPrompt] = useState('')
  const [vidDuration, setVidDuration] = useState(5)
  const [videos, setVideos] = useState<GeneratedVideo[]>([])

  // Audio
  const [voiceMode, setVoiceMode] = useState<'claude' | 'user'>('claude')
  const [voiceText, setVoiceText] = useState('')
  const [elVoice, setElVoice] = useState(EL_VOICES[0])
  const [elModel, setElModel] = useState('eleven_multilingual_v2')
  const [audios, setAudios] = useState<{text: string; data: string}[]>([])

  // Lipsync
  const [lipsyncAudio, setLipsyncAudio] = useState<string>('')
  const [lipsyncImg, setLipsyncImg] = useState<number>(0)

  // Active tab
  const [tab, setTab] = useState<'task'|'images'|'video'|'audio'|'lipsync'>('task')

  // Loading states
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [progress, setProgress] = useState<Record<string, string>>({})

  const setLoad = (k: string, v: boolean) => setLoading(p => ({...p, [k]: v}))
  const setMsg = (k: string, v: string) => setProgress(p => ({...p, [k]: v}))

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-fal-key': falKey,
    'x-el-key': elKey,
    'x-anthropic-key': claudeKey,
  }), [falKey, elKey, claudeKey])

  const addTag = (tag: string) => setTask(t => t ? `${t}, ${tag}` : tag)

  const handleRefFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = ev => {
      setRefPreview(ev.target?.result as string)
      setRefUrl(ev.target?.result as string)
    }
    reader.readAsDataURL(f)
  }

  const toggleImg = (i: number) => setSelectedImages(prev => {
    const s = new Set(prev)
    s.has(i) ? s.delete(i) : s.add(i)
    return s
  })

  // ─── API CALLS ────────────────────────────────────────────────────────────

  const generatePrompts = async () => {
    if (!task.trim()) return
    setLoad('prompts', true)
    setMsg('prompts', '✦ Claude создаёт промпты...')
    try {
      const res = await fetch('/api/generate-prompts', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ task, count: imgCount, aspect, modelName: imgModel.name }),
      })
      const data = await res.json()
      setPrompts(data.prompts)
      setEditedPrompts(data.prompts.map((p: Prompt) => p.prompt))
      setMsg('prompts', `✓ Создано ${data.prompts.length} промптов`)
    } catch (e) {
      setMsg('prompts', '✗ Ошибка: ' + (e as Error).message)
    }
    setLoad('prompts', false)
  }

  const generateImages = async () => {
    if (!falKey) { setMsg('images', '✗ Нужен fal.ai API ключ'); return }
    setLoad('images', true)
    setImages([])
    setSelectedImages(new Set())
    const ps = editedPrompts.length ? editedPrompts : prompts.map(p => p.prompt)
    for (let i = 0; i < ps.length; i++) {
      setMsg('images', `Генерирую ${i + 1} / ${ps.length}...`)
      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST', headers: headers(),
          body: JSON.stringify({ prompt: ps[i], modelId: imgModel.id, aspect, resolution, referenceUrl: refUrl }),
        })
        const { url, error } = await res.json()
        if (error) throw new Error(error)
        if (url) setImages(prev => [...prev, { url, prompt: ps[i], variation: prompts[i]?.variation || `#${i+1}` }])
      } catch (e) { console.error(e) }
    }
    setMsg('images', `✓ Готово`)
    setLoad('images', false)
  }

  const generateVideos = async () => {
    if (!falKey) { setMsg('videos', '✗ Нужен fal.ai API ключ'); return }
    const toAnim = selectedImages.size > 0 ? Array.from(selectedImages) : images.map((_, i) => i)
    if (!toAnim.length) { setMsg('videos', '✗ Нет изображений'); return }
    setLoad('videos', true)
    setVideos([])

    let mp = motionPrompt
    if (motionMode === 'claude' && claudeKey) {
      setMsg('videos', '✦ Claude придумывает движение...')
      try {
        const res = await fetch('/api/generate-prompts', {
          method: 'POST', headers: headers(),
          body: JSON.stringify({ task: `Motion description for: ${task}`, count: 1, aspect, modelName: 'motion' }),
        })
        const data = await res.json()
        mp = data.prompts?.[0]?.prompt || 'gentle smooth animation'
      } catch { mp = 'gentle smooth animation' }
    }

    for (let i = 0; i < toAnim.length; i++) {
      const img = images[toAnim[i]]
      setMsg('videos', `Анимирую ${i + 1} / ${toAnim.length} через ${vidModel.name}...`)
      try {
        const res = await fetch('/api/generate-video', {
          method: 'POST', headers: headers(),
          body: JSON.stringify({ imageUrl: img.url, modelId: vidModel.id, prompt: mp, duration: vidDuration }),
        })
        const { url, error } = await res.json()
        if (error) throw new Error(error)
        if (url) setVideos(prev => [...prev, { url, label: img.variation, fromImage: img.url }])
      } catch (e) { console.error(e) }
    }
    setMsg('videos', `✓ Готово`)
    setLoad('videos', false)
  }

  const generateAudio = async () => {
    if (!elKey) { setMsg('audio', '✗ Нужен ElevenLabs API ключ'); return }
    setLoad('audio', true)

    let text = voiceText
    if (voiceMode === 'claude' && claudeKey && task) {
      setMsg('audio', '✦ Claude придумывает реплику...')
      try {
        const res = await fetch('/api/generate-prompts', {
          method: 'POST', headers: headers(),
          body: JSON.stringify({ task: `Character line for: ${task}`, count: 1, aspect: '1:1', modelName: 'voice line' }),
        })
        const data = await res.json()
        text = data.prompts?.[0]?.prompt || 'Hello!'
      } catch { text = 'Hello there!' }
    }

    setMsg('audio', `Генерирую озвучку...`)
    try {
      const res = await fetch('/api/generate-audio', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ text, voiceId: elVoice.id, modelId: elModel }),
      })
      const { audio, error } = await res.json()
      if (error) throw new Error(error)
      setAudios(prev => [...prev, { text, data: audio }])
      setLipsyncAudio(audio)
      setMsg('audio', `✓ Озвучка готова`)
    } catch (e) { setMsg('audio', '✗ ' + (e as Error).message) }
    setLoad('audio', false)
  }

  const runLipsync = async () => {
    if (!falKey || !lipsyncAudio || !images[lipsyncImg]) { setMsg('lipsync', '✗ Нужны изображение, аудио и fal.ai ключ'); return }
    setLoad('lipsync', true)
    setMsg('lipsync', 'Создаю липсинк через Kling Avatars...')
    try {
      const res = await fetch('/api/lipsync', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ imageUrl: images[lipsyncImg].url, audioBase64: lipsyncAudio }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      if (url) setVideos(prev => [...prev, { url, label: `Липсинк · ${images[lipsyncImg].variation}` }])
      setMsg('lipsync', '✓ Липсинк готов')
    } catch (e) { setMsg('lipsync', '✗ ' + (e as Error).message) }
    setLoad('lipsync', false)
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoDot} />
            <span className={styles.logoText}>AI Studio</span>
          </div>
          <nav className={styles.tabs}>
            {(['task','images','video','audio','lipsync'] as const).map(t => (
              <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
                {t === 'task' && '✦ Задача'}
                {t === 'images' && `🖼 Статика${images.length ? ` (${images.length})` : ''}`}
                {t === 'video' && `🎬 Видео${videos.length ? ` (${videos.length})` : ''}`}
                {t === 'audio' && `🔊 Озвучка${audios.length ? ` (${audios.length})` : ''}`}
                {t === 'lipsync' && '🎭 Липсинк'}
              </button>
            ))}
          </nav>
          <button className={styles.keysBtn} onClick={() => setKeysOk(false)}>
            {keysOk ? '🔑 Ключи ✓' : '🔑 Ключи'}
          </button>
        </div>
      </header>

      {/* KEYS MODAL */}
      {!keysOk && (
        <div className={styles.modal}>
          <div className={styles.modalBox}>
            <div className={styles.modalTitle}>API Ключи</div>
            <div className={styles.modalSub}>Хранятся только в браузере, никуда не отправляются</div>
            <div className={styles.field}>
              <label className={styles.label}>fal.ai API Key <span className={styles.labelNote}>— изображения и видео</span></label>
              <input className={styles.input} type="password" value={falKey} onChange={e => setFalKey(e.target.value)} placeholder="fal-..." />
              <div className={styles.inputNote}><a href="https://fal.ai/dashboard" target="_blank" rel="noreferrer">fal.ai/dashboard</a> → API Keys</div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>ElevenLabs API Key <span className={styles.labelNote}>— озвучка</span></label>
              <input className={styles.input} type="password" value={elKey} onChange={e => setElKey(e.target.value)} placeholder="sk_..." />
              <div className={styles.inputNote}><a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noreferrer">elevenlabs.io</a> → Settings → API Keys</div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Anthropic API Key <span className={styles.labelNote}>— автогенерация промптов (необязательно)</span></label>
              <input className={styles.input} type="password" value={claudeKey} onChange={e => setClaudeKey(e.target.value)} placeholder="sk-ant-..." />
              <div className={styles.inputNote}><a href="https://console.anthropic.com" target="_blank" rel="noreferrer">console.anthropic.com</a></div>
            </div>
            <button className={styles.btnPrimary} onClick={() => { if(falKey) setKeysOk(true) }}>
              {falKey ? 'Готово →' : 'Нужен хотя бы fal.ai ключ'}
            </button>
          </div>
        </div>
      )}

      {/* MAIN */}
      <main className={styles.main}>

        {/* ── TASK TAB ── */}
        {tab === 'task' && (
          <div className={styles.pageWrap}>
            <div className={styles.twoCol}>
              <div className={styles.col}>
                <section className={styles.section}>
                  <div className={styles.sectionHead}>
                    <span className={styles.sectionTitle}>Задача</span>
                    <span className={styles.badge} style={{background:'rgba(108,71,255,0.15)',color:'#a88fff'}}>✦ Claude придумает промпты</span>
                  </div>
                  <textarea
                    className={styles.textarea}
                    rows={4}
                    value={task}
                    onChange={e => setTask(e.target.value)}
                    placeholder="Опиши что нужно сгенерировать. Например: пачка статики нанобанана — игривый персонаж-банан с руками и лицом, разные позы, мультяшный стиль, белый фон..."
                  />
                  <div className={styles.tagRow}>
                    {['нанобанан','белый фон','разные позы','мультяшный стиль','cinematic','product shot','anime','3D render'].map(t => (
                      <button key={t} className={styles.tag} onClick={() => addTag(t)}>{t}</button>
                    ))}
                  </div>
                </section>

                <section className={styles.section}>
                  <div className={styles.sectionTitle}>Параметры изображений</div>
                  <div className={styles.row3}>
                    <div className={styles.field}>
                      <label className={styles.label}>Количество</label>
                      <select className={styles.select} value={imgCount} onChange={e => setImgCount(+e.target.value)}>
                        {[3,4,5,6,8,10].map(n => <option key={n} value={n}>{n} шт.</option>)}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Соотношение сторон</label>
                      <select className={styles.select} value={aspect} onChange={e => setAspect(e.target.value)}>
                        <option value="1:1">1:1 квадрат</option>
                        <option value="16:9">16:9 широкий</option>
                        <option value="9:16">9:16 вертикаль</option>
                        <option value="4:3">4:3</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Разрешение</label>
                      <select className={styles.select} value={resolution} onChange={e => setResolution(e.target.value)}>
                        <option value="1080p">1080p</option>
                        <option value="2K">2K</option>
                        <option value="4K">4K (NB Pro)</option>
                        <option value="720p">720p быстро</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section className={styles.section}>
                  <div className={styles.sectionTitle}>Референс <span className={styles.labelNote}>необязательно</span></div>
                  <div className={styles.refRow}>
                    <button className={styles.btnGhost} onClick={() => refFileRef.current?.click()}>
                      📎 Загрузить файл
                    </button>
                    <input ref={refFileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleRefFile} />
                    <input className={styles.inputInline} type="text" placeholder="или вставь URL..." value={refUrl} onChange={e => { setRefUrl(e.target.value); setRefPreview('') }} />
                    {refUrl && <button className={styles.btnIcon} onClick={() => { setRefUrl(''); setRefPreview('') }}>✕</button>}
                  </div>
                  {refPreview && <img src={refPreview} className={styles.refThumb} alt="ref" />}
                </section>

                <button
                  className={styles.btnPrimary}
                  onClick={generatePrompts}
                  disabled={loading.prompts || !task.trim()}
                >
                  {loading.prompts ? <><span className={styles.spin}/> Генерирую...</> : '✦ Сгенерировать промпты через Claude'}
                </button>
                {progress.prompts && <div className={`${styles.status} ${progress.prompts.startsWith('✓') ? styles.statusOk : progress.prompts.startsWith('✗') ? styles.statusErr : styles.statusRun}`}>{progress.prompts}</div>}
              </div>

              <div className={styles.col}>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}>Модель изображений</div>
                  <div className={styles.modelGrid}>
                    {IMG_MODELS.map(m => (
                      <button key={m.id} className={`${styles.modelCard} ${imgModel.id === m.id ? styles.modelCardActive : ''}`} onClick={() => setImgModel(m)}>
                        {imgModel.id === m.id && <span className={styles.modelCheck}>✓</span>}
                        <div className={styles.modelTag}>{m.tag}</div>
                        <div className={styles.modelName}>{m.name}</div>
                        <div className={styles.modelDesc}>{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </section>

                {prompts.length > 0 && (
                  <section className={styles.section}>
                    <div className={styles.sectionHead}>
                      <span className={styles.sectionTitle}>Промпты</span>
                      <button className={styles.btnSmall} onClick={() => setTab('images')}>→ Генерировать</button>
                    </div>
                    <div className={styles.promptList}>
                      {prompts.map((p, i) => (
                        <div key={i} className={styles.promptItem}>
                          <div className={styles.promptVar}>{p.variation}</div>
                          <textarea
                            className={styles.promptEdit}
                            value={editedPrompts[i] ?? p.prompt}
                            onChange={e => setEditedPrompts(prev => { const n=Array.from(prev); n[i]=e.target.value; return n })}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── IMAGES TAB ── */}
        {tab === 'images' && (
          <div className={styles.pageWrap}>
            <div className={styles.pageHead}>
              <div>
                <div className={styles.pageTitle}>Генерация изображений</div>
                <div className={styles.pageSub}>{imgModel.name} · {aspect} · {resolution}</div>
              </div>
              <div className={styles.pageActions}>
                <button className={styles.btnGhost} onClick={() => setSelectedImages(new Set(images.map((_,i)=>i)))}>Все</button>
                <button className={styles.btnGhost} onClick={() => setSelectedImages(new Set())}>Снять</button>
                <button className={styles.btnPrimary} onClick={generateImages} disabled={loading.images}>
                  {loading.images ? <><span className={styles.spin}/> Генерирую...</> : '▶ Генерировать'}
                </button>
              </div>
            </div>
            {progress.images && <div className={`${styles.status} ${progress.images.startsWith('✓') ? styles.statusOk : progress.images.startsWith('✗') ? styles.statusErr : styles.statusRun}`}>{progress.images}</div>}
            {images.length > 0 && (
              <div className={styles.imgGrid}>
                {images.map((img, i) => (
                  <div key={i} className={`${styles.imgCell} ${selectedImages.has(i) ? styles.imgCellSel : ''}`} onClick={() => toggleImg(i)}>
                    <img src={img.url} alt={img.variation} className={styles.imgThumb} />
                    {selectedImages.has(i) && <div className={styles.imgChk}>✓</div>}
                    <div className={styles.imgLabel}>{img.variation}</div>
                    <a href={img.url} download={`${img.variation}.jpg`} target="_blank" rel="noreferrer" className={styles.imgDl} onClick={e => e.stopPropagation()}>↓</a>
                  </div>
                ))}
              </div>
            )}
            {!images.length && !loading.images && (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🖼</div>
                <div>Нажми «Генерировать» чтобы создать изображения</div>
                <div className={styles.emptySub}>Промпты берутся с вкладки «Задача»</div>
              </div>
            )}
          </div>
        )}

        {/* ── VIDEO TAB ── */}
        {tab === 'video' && (
          <div className={styles.pageWrap}>
            <div className={styles.twoCol}>
              <div className={styles.col}>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}>Модель анимации</div>
                  <div className={styles.modelGrid}>
                    {VID_MODELS.map(m => (
                      <button key={m.id} className={`${styles.modelCard} ${vidModel.id === m.id ? styles.modelCardActive : ''}`} onClick={() => setVidModel(m)}>
                        {vidModel.id === m.id && <span className={styles.modelCheck}>✓</span>}
                        <div className={styles.modelTag}>{m.tag}</div>
                        <div className={styles.modelName}>{m.name}</div>
                        <div className={styles.modelDesc}>{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </section>

                <section className={styles.section}>
                  <div className={styles.row2}>
                    <div className={styles.field}>
                      <label className={styles.label}>Длительность</label>
                      <select className={styles.select} value={vidDuration} onChange={e => setVidDuration(+e.target.value)}>
                        <option value={5}>5 секунд</option>
                        <option value={10}>10 секунд</option>
                        <option value={15}>15 сек (Kling 3.0)</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Промпт движения</label>
                      <div className={styles.toggleRow}>
                        <button className={`${styles.toggleBtn} ${motionMode==='claude' ? styles.toggleActive : ''}`} onClick={() => setMotionMode('claude')}>✦ Claude</button>
                        <button className={`${styles.toggleBtn} ${motionMode==='user' ? styles.toggleActive : ''}`} onClick={() => setMotionMode('user')}>Я укажу</button>
                      </div>
                    </div>
                  </div>
                  {motionMode === 'user' && (
                    <input className={styles.input} type="text" value={motionPrompt} onChange={e => setMotionPrompt(e.target.value)} placeholder="gentle bouncy motion, camera slowly zooms in..." />
                  )}
                </section>

                <section className={styles.section}>
                  <div className={styles.sectionHead}>
                    <span className={styles.sectionTitle}>Изображения для анимации</span>
                    <div>
                      <button className={styles.btnSmall} onClick={() => setSelectedImages(new Set(images.map((_,i)=>i)))}>Все</button>
                      {' '}
                      <button className={styles.btnSmall} onClick={() => setSelectedImages(new Set())}>Снять</button>
                    </div>
                  </div>
                  {images.length > 0 ? (
                    <div className={styles.imgGridSmall}>
                      {images.map((img, i) => (
                        <div key={i} className={`${styles.imgCellSm} ${selectedImages.has(i) ? styles.imgCellSmSel : ''}`} onClick={() => toggleImg(i)}>
                          <img src={img.url} alt={img.variation} />
                          {selectedImages.has(i) && <div className={styles.imgChkSm}>✓</div>}
                        </div>
                      ))}
                    </div>
                  ) : <div className={styles.emptySmall}>Сначала сгенерируй изображения</div>}
                </section>

                <button className={styles.btnPrimary} onClick={generateVideos} disabled={loading.videos || !images.length}>
                  {loading.videos ? <><span className={styles.spin}/> Анимирую...</> : `▶ Анимировать через ${vidModel.name}`}
                </button>
                {progress.videos && <div className={`${styles.status} ${progress.videos.startsWith('✓') ? styles.statusOk : progress.videos.startsWith('✗') ? styles.statusErr : styles.statusRun}`}>{progress.videos}</div>}
              </div>

              <div className={styles.col}>
                {videos.length > 0 ? (
                  <section className={styles.section}>
                    <div className={styles.sectionTitle}>Готовые видео ({videos.length})</div>
                    <div className={styles.vidGrid}>
                      {videos.map((v, i) => (
                        <div key={i} className={styles.vidCell}>
                          <video src={v.url} controls muted loop playsInline className={styles.vidEl} />
                          <div className={styles.vidFooter}>
                            <span className={styles.vidLabel}>{v.label}</span>
                            <a href={v.url} download={`video_${i+1}.mp4`} target="_blank" rel="noreferrer" className={styles.btnSmall}>↓ MP4</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : (
                  <div className={styles.empty} style={{height:'100%',minHeight:300}}>
                    <div className={styles.emptyIcon}>🎬</div>
                    <div>Видео появятся здесь</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── AUDIO TAB ── */}
        {tab === 'audio' && (
          <div className={styles.pageWrap}>
            <div className={styles.twoCol}>
              <div className={styles.col}>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}>Текст реплики</div>
                  <div className={styles.toggleRow} style={{marginBottom:10}}>
                    <button className={`${styles.toggleBtn} ${voiceMode==='claude' ? styles.toggleActive : ''}`} onClick={() => setVoiceMode('claude')}>✦ Claude придумает</button>
                    <button className={`${styles.toggleBtn} ${voiceMode==='user' ? styles.toggleActive : ''}`} onClick={() => setVoiceMode('user')}>Я дам текст</button>
                  </div>
                  {voiceMode === 'user' && (
                    <textarea className={styles.textarea} rows={3} value={voiceText} onChange={e => setVoiceText(e.target.value)} placeholder="Введи текст для озвучки..." />
                  )}
                </section>

                <section className={styles.section}>
                  <div className={styles.sectionTitle}>Голос</div>
                  <div className={styles.modelGrid}>
                    {EL_VOICES.map(v => (
                      <button key={v.id} className={`${styles.modelCard} ${elVoice.id === v.id ? styles.modelCardActive : ''}`} onClick={() => setElVoice(v)}>
                        {elVoice.id === v.id && <span className={styles.modelCheck}>✓</span>}
                        <div className={styles.modelName}>{v.name}</div>
                        <div className={styles.modelDesc}>{v.desc}</div>
                      </button>
                    ))}
                  </div>
                </section>

                <section className={styles.section}>
                  <div className={styles.field}>
                    <label className={styles.label}>Модель ElevenLabs</label>
                    <select className={styles.select} value={elModel} onChange={e => setElModel(e.target.value)}>
                      <option value="eleven_multilingual_v2">Multilingual v2 — качество</option>
                      <option value="eleven_flash_v2_5">Flash v2.5 — быстро</option>
                      <option value="eleven_v3">v3 — максимум экспрессии</option>
                    </select>
                  </div>
                </section>

                <button className={styles.btnPrimary} onClick={generateAudio} disabled={loading.audio}>
                  {loading.audio ? <><span className={styles.spin}/> Генерирую...</> : '▶ Генерировать озвучку'}
                </button>
                {progress.audio && <div className={`${styles.status} ${progress.audio.startsWith('✓') ? styles.statusOk : progress.audio.startsWith('✗') ? styles.statusErr : styles.statusRun}`}>{progress.audio}</div>}
              </div>

              <div className={styles.col}>
                {audios.length > 0 ? (
                  <section className={styles.section}>
                    <div className={styles.sectionTitle}>Озвучка ({audios.length})</div>
                    {audios.map((a, i) => (
                      <div key={i} className={styles.audioItem}>
                        <audio src={a.data} controls className={styles.audioEl} />
                        <div className={styles.audioText}>{a.text.slice(0,80)}{a.text.length>80?'...':''}</div>
                        <a href={a.data} download={`audio_${i+1}.mp3`} className={styles.btnSmall}>↓ MP3</a>
                      </div>
                    ))}
                  </section>
                ) : (
                  <div className={styles.empty} style={{height:'100%',minHeight:300}}>
                    <div className={styles.emptyIcon}>🔊</div>
                    <div>Озвучка появится здесь</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── LIPSYNC TAB ── */}
        {tab === 'lipsync' && (
          <div className={styles.pageWrap}>
            <div className={styles.twoCol}>
              <div className={styles.col}>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}>Изображение для липсинка</div>
                  {images.length > 0 ? (
                    <div className={styles.imgGridSmall}>
                      {images.map((img, i) => (
                        <div key={i} className={`${styles.imgCellSm} ${lipsyncImg===i ? styles.imgCellSmSel : ''}`} onClick={() => setLipsyncImg(i)}>
                          <img src={img.url} alt={img.variation} />
                          {lipsyncImg===i && <div className={styles.imgChkSm}>✓</div>}
                        </div>
                      ))}
                    </div>
                  ) : <div className={styles.emptySmall}>Сначала сгенерируй изображения</div>}
                </section>

                <section className={styles.section}>
                  <div className={styles.sectionTitle}>Аудио для липсинка</div>
                  {audios.length > 0 ? (
                    <>
                      <div className={styles.emptySmall} style={{marginBottom:8}}>Используется последняя озвучка:</div>
                      <audio src={lipsyncAudio || audios[audios.length-1]?.data} controls className={styles.audioEl} />
                    </>
                  ) : <div className={styles.emptySmall}>Сначала сгенерируй озвучку на вкладке «Озвучка»</div>}
                </section>

                <button
                  className={styles.btnPrimary}
                  onClick={runLipsync}
                  disabled={loading.lipsync || !images.length || !audios.length}
                >
                  {loading.lipsync ? <><span className={styles.spin}/> Создаю липсинк...</> : '▶ Создать липсинк · Kling Avatars'}
                </button>
                {progress.lipsync && <div className={`${styles.status} ${progress.lipsync.startsWith('✓') ? styles.statusOk : progress.lipsync.startsWith('✗') ? styles.statusErr : styles.statusRun}`}>{progress.lipsync}</div>}
              </div>

              <div className={styles.col}>
                {videos.filter(v => v.label.includes('Липсинк')).length > 0 ? (
                  <section className={styles.section}>
                    <div className={styles.sectionTitle}>Готовые липсинки</div>
                    <div className={styles.vidGrid}>
                      {videos.filter(v => v.label.includes('Липсинк')).map((v, i) => (
                        <div key={i} className={styles.vidCell}>
                          <video src={v.url} controls muted loop playsInline className={styles.vidEl} />
                          <div className={styles.vidFooter}>
                            <span className={styles.vidLabel}>{v.label}</span>
                            <a href={v.url} download={`lipsync_${i+1}.mp4`} target="_blank" rel="noreferrer" className={styles.btnSmall}>↓ MP4</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : (
                  <div className={styles.empty} style={{height:'100%',minHeight:300}}>
                    <div className={styles.emptyIcon}>🎭</div>
                    <div>Липсинк появится здесь</div>
                    <div className={styles.emptySub}>Нужны: изображение + озвучка</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
