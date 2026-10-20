import BottomSheet from './BottomSheet.jsx'

const steps = [
  {
    title: 'Join',
    text: 'Scan the host’s QR code or type the 6-character code, then pick a name.',
  },
  {
    title: 'Find it',
    text: 'Each square is something you can spot around you, like someone wearing braces.',
  },
  {
    title: 'Snap it',
    text: 'Tap the square and take a selfie with that person. Ask first. Anyone can say no.',
  },
  {
    title: 'Bingo',
    text: 'Complete a row, column or diagonal. Fastest time wins.',
  },
]

const rules = [
  'A different person in every photo.',
  'The thing on the square must be visible in the photo.',
  'No photos of screens or pictures.',
  'Break a rule and the host can disqualify you.',
  'Only the host sees your photos. They’re deleted 24 hours after the game.',
  'No mobile data? Team up with a friend.',
]

function HowToPlay({ open, onClose }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="How to play">
      <ol className="mt-5 flex flex-col gap-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mint font-bold text-navy">
              {i + 1}
            </span>
            <div>
              <p className="font-bold">{step.title}</p>
              <p className="text-lavender">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <h3 className="mt-6 text-lg font-bold">Rules</h3>
      <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-lavender">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>

      {/* autoFocus: React focuses this button when the sheet opens. */}
      <button
        type="button"
        autoFocus
        onClick={onClose}
        className="mt-6 h-14 w-full rounded-full bg-periwinkle text-lg font-bold text-navy shadow-[0_4px_0_#6569D4] active:translate-y-1 active:shadow-none"
      >
        Got it
      </button>
    </BottomSheet>
  )
}

export default HowToPlay
