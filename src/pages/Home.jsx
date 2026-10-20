// Fixed star positions (percent of the screen) so they don't jump on re-render.
const stars = [
  { top: 6, left: 12, size: 2, opacity: 0.3 },
  { top: 9, left: 48, size: 3, opacity: 0.4 },
  { top: 14, left: 30, size: 2, opacity: 0.2 },
  { top: 17, left: 68, size: 2, opacity: 0.35 },
  { top: 22, left: 8, size: 3, opacity: 0.25 },
  { top: 25, left: 88, size: 2, opacity: 0.3 },
  { top: 29, left: 40, size: 2, opacity: 0.2 },
  { top: 33, left: 20, size: 2, opacity: 0.4 },
  { top: 36, left: 76, size: 3, opacity: 0.25 },
  { top: 41, left: 56, size: 2, opacity: 0.3 },
  { top: 44, left: 6, size: 2, opacity: 0.2 },
  { top: 47, left: 92, size: 2, opacity: 0.35 },
]

// Mini card colours: a mint diagonal (a finished line) and one pink square.
const miniSquares = [
  'bg-mint', 'bg-navy', 'bg-navy',
  'bg-navy', 'bg-mint', 'bg-pink',
  'bg-navy', 'bg-navy', 'bg-mint',
]

function Home() {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-[440px] flex-col overflow-hidden bg-navy px-6">
      <div aria-hidden="true">
        {stars.map((star, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-soft-white"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            }}
          />
        ))}
        <svg
          viewBox="0 0 24 24"
          className="absolute top-10 right-8 size-7 text-lavender opacity-60"
        >
          <path
            fill="currentColor"
            d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"
          />
        </svg>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <div
          aria-hidden="true"
          className="mb-8 grid -rotate-6 grid-cols-3 gap-1.5 rounded-2xl bg-navy-light p-2"
        >
          {miniSquares.map((colour, i) => (
            <div key={i} className={`size-10 rounded-lg ${colour}`} />
          ))}
        </div>

        <h1 className="text-6xl font-extrabold tracking-tight text-soft-white">
          Binglo
        </h1>
        <p className="mt-3 text-lavender">
          Real-life bingo. Spot it, snap a selfie, mark the square.
        </p>
      </div>

      <div className="relative flex flex-col gap-3 pb-8">
        <button
          type="button"
          className="h-14 w-full rounded-full bg-periwinkle text-lg font-bold text-navy shadow-[0_4px_0_#6569D4] active:translate-y-1 active:shadow-none"
        >
          Create game
        </button>
        <button
          type="button"
          className="h-14 w-full rounded-full border-2 border-lavender bg-transparent text-lg font-bold text-soft-white"
        >
          Join game
        </button>
        <button
          type="button"
          onClick={() => {}}
          className="flex min-h-11 items-center justify-center gap-2 font-semibold text-lavender"
        >
          <span className="flex size-7 items-center justify-center rounded-full border-2 border-lavender font-bold">
            ?
          </span>
          How to play
        </button>
      </div>
    </main>
  )
}

export default Home
