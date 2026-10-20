import { useState } from 'react'
import { Link } from 'react-router'
import AppShell from '../components/AppShell.jsx'
import BottomSheet from '../components/BottomSheet.jsx'
import Segmented from '../components/Segmented.jsx'
import { promptsNeeded } from '../lib/game.js'

const categories = [
  { value: 'apu', label: 'APU orientation' },
  { value: 'custom', label: 'Custom' },
]

// Shown but not playable in v1.
const lockedCategories = ['Campus', 'Park', 'Indoors', 'Party']

const gridSizes = [
  { value: 4, label: '4×4' },
  { value: 5, label: '5×5' },
  { value: 6, label: '6×6' },
]

const timers = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 20, label: '20 min' },
]

const winnerOptions = [
  { value: 3, label: 'Top 3' },
  { value: 5, label: 'Top 5' },
]

const inputClass =
  'w-full rounded-2xl border-2 border-transparent bg-navy-light px-4 text-soft-white placeholder:text-lavender focus:border-periwinkle focus:outline-none'

const mainButtonClass =
  'h-14 w-full rounded-full bg-periwinkle text-lg font-bold text-navy shadow-[0_4px_0_#6569D4] enabled:active:translate-y-1 enabled:active:shadow-none disabled:opacity-50'

// One prompt per line: trim each line, drop empty ones, remove duplicates.
function parsePrompts(text) {
  const lines = text.split('\n').map((line) => line.trim())
  return [...new Set(lines.filter((line) => line !== ''))]
}

function CreateGame() {
  const [category, setCategory] = useState('apu')
  const [gridSize, setGridSize] = useState(5)
  const [minutes, setMinutes] = useState(10)
  const [winnersCount, setWinnersCount] = useState(3)

  // customText is what's in the textarea; customPrompts is what was saved.
  const [customText, setCustomText] = useState('')
  const [customPrompts, setCustomPrompts] = useState([])
  const [showCustomSheet, setShowCustomSheet] = useState(false)

  const needed = promptsNeeded(gridSize)
  const draftCount = parsePrompts(customText).length
  const missingPrompts =
    category === 'custom' ? Math.max(0, needed - customPrompts.length) : 0
  const canCreate = missingPrompts === 0

  function handleCategoryClick(value) {
    setCategory(value)
    if (value === 'custom') setShowCustomSheet(true)
  }

  function handleSavePrompts() {
    setCustomPrompts(parsePrompts(customText))
    setShowCustomSheet(false)
  }

  function handleCreate() {
    console.log({
      category,
      gridSize,
      durationSec: minutes * 60,
      winnersCount,
      customPrompts: category === 'custom' ? customPrompts : null,
    })
  }

  return (
    <AppShell>
      <Link
        to="/"
        className="mt-4 flex min-h-11 items-center self-start font-semibold text-lavender"
      >
        Back
      </Link>
      <h1 className="mt-4 text-3xl font-bold">New game</h1>

      <div className="mt-6 flex flex-col gap-6">
        <section>
          <h2 id="category-label" className="mb-2 font-semibold">
            Category
          </h2>
          <div
            role="radiogroup"
            aria-labelledby="category-label"
            className="grid grid-cols-2 gap-2"
          >
            {categories.map((option) => {
              const selected = option.value === category
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleCategoryClick(option.value)}
                  className={`h-14 rounded-2xl font-semibold ${
                    selected ? 'bg-mint text-navy' : 'bg-navy-light text-soft-white'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          <p className="mt-3 text-sm text-lavender">Coming soon</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {lockedCategories.map((name) => (
              <button
                key={name}
                type="button"
                aria-disabled="true"
                className="flex h-11 cursor-not-allowed items-center justify-center gap-1 rounded-2xl bg-navy-light/50 text-sm font-semibold text-lavender"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                {name}
              </button>
            ))}
          </div>

          {missingPrompts > 0 && (
            <button
              type="button"
              onClick={() => setShowCustomSheet(true)}
              className="mt-2 min-h-11 text-left font-semibold text-coral"
            >
              Add {missingPrompts} more prompts for this grid size
            </button>
          )}
        </section>

        <section>
          <h2 id="grid-label" className="mb-2 font-semibold">
            Grid size
          </h2>
          <Segmented
            aria-labelledby="grid-label"
            options={gridSizes}
            value={gridSize}
            onChange={setGridSize}
          />
        </section>

        <section>
          <h2 id="timer-label" className="mb-2 font-semibold">
            Timer
          </h2>
          <Segmented
            aria-labelledby="timer-label"
            options={timers}
            value={minutes}
            onChange={setMinutes}
          />
        </section>

        <section>
          <h2 id="winners-label" className="mb-2 font-semibold">
            Winners
          </h2>
          <Segmented
            aria-labelledby="winners-label"
            options={winnerOptions}
            value={winnersCount}
            onChange={setWinnersCount}
          />
        </section>
      </div>

      <div className="sticky bottom-0 -mx-6 mt-auto bg-navy px-6 pt-3 pb-6">
        <button
          type="button"
          disabled={!canCreate}
          onClick={handleCreate}
          className={mainButtonClass}
        >
          Create game
        </button>
      </div>

      <BottomSheet
        open={showCustomSheet}
        onClose={() => setShowCustomSheet(false)}
        title="Custom prompts"
      >
        <label htmlFor="custom-prompts" className="mt-2 block text-lavender">
          One prompt per line.
        </label>
        <textarea
          id="custom-prompts"
          autoFocus
          value={customText}
          onChange={(event) => setCustomText(event.target.value)}
          className={`mt-3 min-h-48 py-3 ${inputClass}`}
        />
        <p className={`mt-2 ${draftCount >= needed ? 'text-mint' : 'text-lavender'}`}>
          {draftCount} of {needed} prompts
        </p>
        <button
          type="button"
          disabled={draftCount < needed}
          onClick={handleSavePrompts}
          className={`mt-6 ${mainButtonClass}`}
        >
          Save prompts
        </button>
      </BottomSheet>
    </AppShell>
  )
}

export default CreateGame
