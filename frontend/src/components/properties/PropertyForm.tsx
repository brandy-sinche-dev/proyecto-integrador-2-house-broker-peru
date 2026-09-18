import type { FormEvent } from 'react'
import { Button } from '../Button'
import { Stepper } from '../Stepper'
import type { Property } from '../../services/types'
import { FORM_STEPS, usePropertyForm } from './usePropertyForm'
import { FormStepBasic } from './steps/basic'
import { FormStepFeatures } from './steps/features'
import { FormStepMedia } from './steps/media'
import { FormStepPricing } from './steps/pricing'
import './PropertyForm.css'

interface PropertyFormProps {
  property?: Property
  onCancel: () => void
  onSaved: () => void
}

export function PropertyForm({ property, onCancel, onSaved }: PropertyFormProps) {
  const form = usePropertyForm({ property, onSaved })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    form.submit()
  }

  return (
    <form onSubmit={handleSubmit} className="hform">
      <Stepper steps={FORM_STEPS} current={form.step} />

      <div className="hform__card">
        {form.step === 0 && (
          <FormStepBasic
            mode={form.mode}
            onModeChange={form.setMode}
            data={form.basic}
            onChange={form.setBasic}
            errors={form.errors}
          />
        )}
        {form.step === 1 && (
          <FormStepFeatures
            data={form.features}
            errors={form.errors}
            onChange={(next) => {
              form.setFeatures(next)
              const rest = { ...form.errors }
              for (const key of ['area_total', 'area_construida', 'dormitorios', 'banos', 'estacionamientos']) {
                delete rest[key as keyof typeof rest]
              }
              form.setErrors(rest)
            }}
          />
        )}
        {form.step === 2 && <FormStepMedia data={form.media} onChange={form.setMedia} />}
        {form.step === 3 && (
          <FormStepPricing
            data={form.pricing}
            onChange={(next) => {
              form.setPricing(next)
              if (form.errors.price) {
                const rest = { ...form.errors }
                delete rest.price
                form.setErrors(rest)
              }
            }}
            isEdit={form.isEdit}
            error={form.errors.price}
          />
        )}
      </div>

      {form.submitError && <p className="hform__error" aria-live="polite" role="alert">{form.submitError}</p>}

      <div className="hform__footer">
        <Button type="button" variant="neutral" onClick={form.step > 0 ? form.goBack : onCancel}>
          {form.step > 0 ? 'Anterior' : 'Cancelar'}
        </Button>
        {form.isLast ? (
          <Button type="submit" disabled={form.saving}>
            {form.saving ? 'Guardando…' : form.isEdit ? 'Guardar cambios' : 'Publicar propiedad'}
          </Button>
        ) : (
          <Button type="button" onClick={form.goNext}>
            Continuar
          </Button>
        )}
      </div>
    </form>
  )
}