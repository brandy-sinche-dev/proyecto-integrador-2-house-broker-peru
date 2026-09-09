import './ToggleGroup.css'

interface ToggleOption<T extends string> {
  value: T
  label: string
}

interface ToggleGroupProps<T extends string> {
  options: ToggleOption<T>[]
  value: T | undefined
  onChange: (value: T) => void
}

export function ToggleGroup<T extends string>({ options, value, onChange }: ToggleGroupProps<T>) {
  return (
    <div className="htoggle" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          className={`htoggle__item ${value === o.value ? 'htoggle__item--active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
