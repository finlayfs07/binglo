import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Card size: 9:16, Instagram story.
const W = 1080
const H = 1920

// Same palette as the app (canvas can't read Tailwind classes).
const C = {
  navy: '#1C1F4A',
  navyLight: '#2A2E66',
  white: '#F4F4FB',
  lavender: '#B9BCE6',
  pink: '#F2B6D6',
}

const mainButtonClass =
  'h-14 w-full rounded-full bg-periwinkle text-lg font-bold text-navy shadow-[0_4px_0_#6569D4] enabled:active:translate-y-1 enabled:active:shadow-none disabled:opacity-50'

const outlinedButtonClass =
  'h-14 w-full rounded-full border-2 border-lavender text-lg font-bold text-soft-white'

// 401 -> "6:41"
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

// Draw the middle square of a photo into a square cell (like object-cover).
function drawCover(ctx, img, x, y, size) {
  const side = Math.min(img.width, img.height)
  const sx = (img.width - side) / 2
  const sy = (img.height - side) / 2
  ctx.drawImage(img, sx, sy, side, side, x, y, size, size)
}

// Centered multi-line text that fits maxWidth.
function wrapText(ctx, text, centerX, centerY, maxWidth, lineHeight) {
  const lines = []
  let line = ''
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  const startY = centerY - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((l, i) => ctx.fillText(l, centerX, startY + i * lineHeight))
}

async function buildCard({ board, gridSize, photosByCell, winningLine, headline, subline }) {
  // Make sure Nunito is loaded before drawing, or the canvas falls back to Arial.
  await Promise.all([
    document.fonts.load('800 120px Nunito'),
    document.fonts.load('600 40px Nunito'),
  ])

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = C.navy
  ctx.fillRect(0, 0, W, H)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Header
  ctx.fillStyle = C.white
  ctx.font = '800 120px Nunito'
  ctx.fillText('Binglo', W / 2, 230)
  ctx.fillStyle = C.pink
  ctx.font = '800 64px Nunito'
  ctx.fillText(headline, W / 2, 380)
  ctx.fillStyle = C.lavender
  ctx.font = '600 40px Nunito'
  ctx.fillText(subline, W / 2, 450)

  // Board
  const pad = 60
  const gap = 12
  const cell = (W - pad * 2 - gap * (gridSize - 1)) / gridSize
  const top = 560
  const lineSet = new Set(winningLine ?? [])

  board.forEach((square, i) => {
    const x = pad + (i % gridSize) * (cell + gap)
    const y = top + Math.floor(i / gridSize) * (cell + gap)
    const photo = photosByCell.get(i)

    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x, y, cell, cell, 24)
    ctx.clip()

    if (square.type === 'free') {
      ctx.fillStyle = C.pink
      ctx.fillRect(x, y, cell, cell)
      ctx.fillStyle = C.navy
      ctx.font = `800 ${Math.round(cell * 0.2)}px Nunito`
      ctx.fillText('FREE', x + cell / 2, y + cell / 2)
    } else if (photo) {
      drawCover(ctx, photo, x, y, cell)
    } else {
      ctx.fillStyle = C.navyLight
      ctx.fillRect(x, y, cell, cell)
      ctx.fillStyle = C.lavender
      ctx.font = `600 ${Math.round(cell * 0.11)}px Nunito`
      wrapText(ctx, square.text, x + cell / 2, y + cell / 2, cell - 24, Math.round(cell * 0.13))
    }
    ctx.restore()

    // Winning line: pink outline
    if (lineSet.has(i)) {
      ctx.strokeStyle = C.pink
      ctx.lineWidth = 10
      ctx.beginPath()
      ctx.roundRect(x + 5, y + 5, cell - 10, cell - 10, 20)
      ctx.stroke()
    }
  })

  // Footer
  ctx.fillStyle = C.lavender
  ctx.font = '700 40px Nunito'
  ctx.fillText('binglo.vercel.app', W / 2, H - 120)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not make the image'))),
      'image/jpeg',
      0.9,
    )
  })
}

function ShareCard({ player, gridSize, me, playerCount }) {
  const [status, setStatus] = useState('idle') // 'idle' | 'making' | 'ready' | 'error'
  const [error, setError] = useState(null)
  const [blob, setBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  // Free the preview's memory when it changes or the screen closes.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function makeCard() {
    setStatus('making')
    setError(null)
    try {
      // Fresh copy: winning_line may have been set after this page loaded.
      const { data: me_row, error: playerError } = await supabase
        .from('players')
        .select('winning_line')
        .eq('id', player.id)
        .single()
      if (playerError) throw playerError

      const { data: marks, error: marksError } = await supabase
        .from('marks')
        .select('cell_index, photo_path')
        .eq('player_id', player.id)
      if (marksError) throw marksError

      // Download own photos. A missing one just shows its prompt instead.
      const photosByCell = new Map()
      await Promise.all(
        marks.map(async (mark) => {
          const { data, error: downloadError } = await supabase.storage
            .from('proofs')
            .download(mark.photo_path)
          if (downloadError) return
          photosByCell.set(mark.cell_index, await createImageBitmap(data))
        }),
      )

      const headline =
        me.time_sec !== null
          ? `Bingo in ${formatTime(me.time_sec)}`
          : `${me.total} ${me.total === 1 ? 'square' : 'squares'}`
      const subline = `#${me.rank} of ${playerCount} · ${me.name}`

      const result = await buildCard({
        board: player.board,
        gridSize,
        photosByCell,
        winningLine: me_row.winning_line,
        headline,
        subline,
      })
      setBlob(result)
      setPreviewUrl(URL.createObjectURL(result))
      setStatus('ready')
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }

  function saveImage() {
    const link = document.createElement('a')
    link.href = previewUrl
    link.download = 'binglo-card.jpg'
    link.click()
  }

  async function shareImage() {
    const file = new File([blob], 'binglo-card.jpg', { type: 'image/jpeg' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'My Binglo card' })
      } catch {
        // The player closed the share sheet.
      }
    } else {
      saveImage() // no share sheet (e.g. some desktops): just download it
    }
  }

  if (status !== 'ready') {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={makeCard}
          disabled={status === 'making'}
          className={mainButtonClass}
        >
          {status === 'making' ? 'Making your card…' : 'Make my bingo card'}
        </button>
        <p className="mt-2 text-center text-sm text-lavender">
          Only share photos of people who said yes. Photos are deleted 24 hours after the game.
        </p>
        {error && (
          <p role="alert" className="mt-2 text-center text-coral">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-3">
      <img
        src={previewUrl}
        alt="Your bingo card"
        className="w-2/3 rounded-2xl border-2 border-navy-light"
      />
      <button type="button" onClick={shareImage} className={mainButtonClass}>
        Share
      </button>
      <button type="button" onClick={saveImage} className={outlinedButtonClass}>
        Save image
      </button>
    </div>
  )
}

export default ShareCard