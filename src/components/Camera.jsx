import { useEffect, useRef, useState } from 'react'

const mainButtonClass =
  'h-14 flex-1 rounded-full bg-periwinkle text-lg font-bold text-navy shadow-[0_4px_0_#6569D4] active:translate-y-1 active:shadow-none'

const outlinedButtonClass =
  'h-14 flex-1 rounded-full border-2 border-lavender text-lg font-bold text-soft-white'

// Full-screen camera for proof photos. Camera only: there is no file input,
// so photos can't come from the gallery.
function Camera({ prompt, onClose, onUsePhoto }) {
  const videoRef = useRef(null)
  const [facingMode, setFacingMode] = useState('environment') // back camera first
  const [attempt, setAttempt] = useState(0) // bump to retry after an error
  const [cameraError, setCameraError] = useState(false)
  const [photo, setPhoto] = useState(null) // { blob, url } once taken

  // Start the camera. The cleanup stops every track, so the camera light
  // goes off when we flip, retry, close or unmount.
  useEffect(() => {
    let stream = null
    let cancelled = false

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('No camera API')
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        })
        if (cancelled) {
          newStream.getTracks().forEach((track) => track.stop())
          return
        }
        stream = newStream
        videoRef.current.srcObject = stream
        setCameraError(false)
      } catch {
        if (!cancelled) setCameraError(true)
      }
    }

    start()
    return () => {
      cancelled = true
      if (stream) stream.getTracks().forEach((track) => track.stop())
    }
  }, [facingMode, attempt])

  // Free the preview image's memory when it's replaced or we close.
  useEffect(() => {
    if (!photo) return
    return () => URL.revokeObjectURL(photo.url)
  }, [photo])

  function handleShutter() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return // camera not ready yet

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (blob) setPhoto({ blob, url: URL.createObjectURL(blob) })
      },
      'image/jpeg',
      0.9,
    )
  }

  function handleFlip() {
    setFacingMode((mode) => (mode === 'environment' ? 'user' : 'environment'))
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Camera: ${prompt}`}
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      <div className="flex items-start gap-3 px-4 pt-4">
        <p className="flex-1 py-2 text-xl font-bold text-soft-white">{prompt}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close camera"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-soft-white"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {/* Always mounted (just hidden), so the stream always has somewhere to go. */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`size-full object-cover ${
            facingMode === 'user' ? '-scale-x-100' : ''
          } ${photo || cameraError ? 'invisible' : ''}`}
        />
        {photo && (
          <img
            src={photo.url}
            alt="Your photo"
            className="absolute inset-0 size-full object-contain"
          />
        )}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <p className="text-2xl font-bold text-soft-white">Camera not available</p>
            <p className="mt-3 max-w-sm text-lavender">
              Binglo needs your camera to take proof photos. Tap the lock or
              settings icon next to the web address, allow Camera for this
              site, then try again.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className={`mt-6 w-full max-w-xs flex-none ${mainButtonClass}`}
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {!cameraError && (
        <div className="px-6 pt-4 pb-8">
          {photo ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className={outlinedButtonClass}
              >
                Retake
              </button>
              <button
                type="button"
                onClick={() => onUsePhoto(photo.blob)}
                className={mainButtonClass}
              >
                Use photo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 items-center">
              <span />
              <button
                type="button"
                onClick={handleShutter}
                aria-label="Take photo"
                className="mx-auto flex size-[72px] items-center justify-center rounded-full bg-soft-white p-1.5 active:scale-95"
              >
                <span className="size-full rounded-full border-[3px] border-navy" />
              </button>
              <button
                type="button"
                onClick={handleFlip}
                className="h-11 justify-self-end rounded-full border-2 border-lavender px-4 font-bold text-soft-white"
              >
                Flip
              </button>
            </div>
          )}
          <p className="mt-4 text-center text-sm text-lavender">
            Ask first. This photo goes to the host, and you can save it to your bingo card later.
          </p>
        </div>
      )}
    </div>
  )
}

export default Camera
