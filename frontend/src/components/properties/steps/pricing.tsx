import { Field } from '../../../components/Field'
import { Select } from '../../../components/Select'
import { TextInput } from '../../../components/TextInput'
import { FormSection } from './FormSection'

export interface PricingData {
  price: string
  moneda: string
  negociable: boolean
  destacado: boolean
}

interface FormStepPricingProps {
  data: PricingData
  onChange: (data: PricingData) => void
  isEdit: boolean
}

export function FormStepPricing({ data, onChange, isEdit }: FormStepPricingProps) {
  return (
    <FormSection
      step={4}
      title="Precio y cierre"
      subtitle="Define el valor y las condiciones de publicación"
    >
      <div className="hform-grid">
        <Field label="Precio" required hint={isEdit ? 'Edita el valor de venta o renta.' : 'Precio en la moneda seleccionada.'}>
          <TextInput
            type="number"
            min={0}
            placeholder="Ej. 850000"
            value={data.price}
            onChange={(e) => onChange({ ...data, price: e.target.value })}
          />
        </Field>

        <Field label="Moneda">
          <Select
            options={[
              { value: 'PEN', label: 'Soles (S/)' },
              { value: 'USD', label: 'Dólares (US$)' },
            ]}
            value={data.moneda}
            onChange={(e) => onChange({ ...data, moneda: e.target.value })}
          />
        </Field>

        <div className="hform-grid__full hform-check">
          <label className="hform-check__item">
            <input
              type="checkbox"
              checked={data.negociable}
              onChange={(e) => onChange({ ...data, negociable: e.target.checked })}
            />
            <span>El precio es negociable</span>
          </label>
          <label className="hform-check__item">
            <input
              type="checkbox"
              checked={data.destacado}
              onChange={(e) => onChange({ ...data, destacado: e.target.checked })}
            />
            <span>Destacar la publicación</span>
          </label>
        </div>
      </div>
    </FormSection>
  )
}