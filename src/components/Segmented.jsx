// A row of options where exactly one is selected, e.g. 4×4 / 5×5 / 6×6.
// Extra props (like aria-labelledby) go on the radiogroup.
function Segmented({ options, value, onChange, ...rest }) {
  return (
    <div role="radiogroup" className="flex rounded-full bg-navy-light p-1" {...rest}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`h-12 flex-1 rounded-full font-semibold ${
              selected ? 'bg-mint text-navy' : 'text-soft-white'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default Segmented
