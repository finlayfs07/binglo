import { useEffect, useId, useRef } from 'react'

function BottomSheet({ open, onClose, title, children }) {
  const titleId = useId()
  const sheetRef = useRef(null)

  // On open: if nothing inside the sheet took focus (e.g. a button with
  // autoFocus), focus the sheet itself so keyboard users start inside it.
  useEffect(() => {
    if (!open) return
    const sheet = sheetRef.current
    if (!sheet.contains(document.activeElement)) sheet.focus()
  }, [open])

  // While open: close on Escape.
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-navy/80"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 mx-auto max-h-[85dvh] max-w-[440px] overflow-y-auto rounded-t-3xl bg-navy-light p-6 text-left outline-none"
      >
        <h2 id={titleId} className="text-2xl font-bold">
          {title}
        </h2>
        {children}
      </div>
    </>
  )
}

export default BottomSheet
