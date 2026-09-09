import './Stepper.css'

interface Step {
  id: string
  label: string
}

interface StepperProps {
  steps: Step[]
  current: number
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="hstepper">
      {steps.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo'
        return (
          <li 
            key={step.id} 
            className={`hstepper__item hstepper__item--${state}`}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <span className="hstepper__dot">{i < current ? '✓' : String(i + 1)}</span>
            <span className="hstepper__label">{step.label}</span>
            {i < steps.length - 1 && <span className="hstepper__line" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}