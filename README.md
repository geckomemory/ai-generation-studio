# AI Generation Studio

Веб-приложение для генерации изображений, видео и озвучки. Работает через fal.ai и ElevenLabs.

## Что умеет

- **Изображения** — Nano Banana Pro, Nano Banana 2, Seedream 4.5, FLUX Pro, FLUX Dev
- **Видео** — Kling 3.0 / 2.5 / 2.1, Wan 2.5, MiniMax Hailuo, Sora 2, Seedance 2.0
- **Озвучка** — ElevenLabs TTS, 5 голосов, 3 модели
- **Липсинк** — Kling Avatars 2.1
- **Claude** — автогенерация промптов и текстов реплик

## Деплой на Vercel (бесплатно)

### 1. Загрузи на GitHub

```bash
git init
git add .
git commit -m "init"
gh repo create ai-generation-studio --public --push
```

### 2. Задеплой на Vercel

1. Зайди на [vercel.com](https://vercel.com) → New Project
2. Импортируй свой GitHub репозиторий
3. В разделе **Environment Variables** добавь:
   - `FAL_KEY` — ключ с [fal.ai/dashboard](https://fal.ai/dashboard) (опционально, можно вводить прямо в интерфейсе)
   - `ELEVENLABS_API_KEY` — ключ с [elevenlabs.io](https://elevenlabs.io) (опционально)
   - `ANTHROPIC_API_KEY` — ключ с [console.anthropic.com](https://console.anthropic.com) (опционально)
4. Нажми Deploy

Готово! Ты получишь ссылку вида `your-studio.vercel.app`.

> **Совет:** если не хочешь хранить ключи на сервере, просто не добавляй их в Vercel — пользователи будут вводить свои ключи прямо в приложении.

## Локальный запуск

```bash
npm install
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000).

## Добавление новых моделей

Открой `app/page.tsx` и добавь в массивы `IMG_MODELS` или `VID_MODELS`:

```ts
{ id: 'fal-ai/новая-модель/endpoint', name: 'Название', tag: 'Тег', desc: 'Описание' }
```

## Стек

- **Next.js 15** — фреймворк
- **TypeScript** — типизация
- **fal.ai** — изображения и видео
- **ElevenLabs** — озвучка
- **Anthropic Claude** — промпты
- **Vercel** — деплой
