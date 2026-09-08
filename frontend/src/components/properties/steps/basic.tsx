import { Field } from '../../../components/Field'
import { FormSection } from './FormSection'
import { Select } from '../../../components/Select'
import { TextInput } from '../../../components/TextInput'
import { ToggleGroup } from '../../../components/ToggleGroup'
import { PROPERTY_TYPES } from '../../../services/types'

export interface BasicData {
  title: string
  address: string
  property_type: string
}

interface FormStepBasicProps {
  mode: 'VENTA' | 'ALQUILER'
  onModeChange: (mode: 'VENTA' | 'ALQUILER') => void
  data: BasicData
  onChange: (data: BasicData) => void
  errors: Partial<Record<keyof BasicData, string>>
}

export function FormStepBasic({ mode, onModeChange, data, onChange, errors }: FormStepBasicProps) {
  return (
    <FormSection
      step={1}
      title="Básicos y ubicación"
      subtitle="Cuéntanos lo esencial del inmueble"
    >
      <div className="hform-grid">
        <Field label="Finalidad" className="hform-grid__full">
          <ToggleGroup<'VENTA' | 'ALQUILER'>
            options={[
              { value: 'VENTA', label: 'Venta' },
              { value: 'ALQUILER', label: 'Alquiler' },
            ]}
            value={mode}
            onChange={onModeChange}
          />
        </Field>

        <Field label="Tipo de propiedad" required error={errors.property_type} className="hform-grid__full">
          <Select
            options={PROPERTY_TYPES.map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }))}
            placeholder="Selecciona un tipo"
            value={data.property_type}
            invalid={Boolean(errors.property_type)}
            onChange={(e) => onChange({ ...data, property_type: e.target.value })}
          />
        </Field>

        <Field label="Título" required error={errors.title}>
          <TextInput
            placeholder="Ej. Penthouse en San Isidro"
            value={data.title}
            invalid={Boolean(errors.title)}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
          />
        </Field>

        <Field label="Dirección" required error={errors.address}>
          <TextInput
            placeholder="Ej. Av. El Derby 123, San Isidro, Lima"
            value={data.address}
            invalid={Boolean(errors.address)}
            onChange={(e) => onChange({ ...data, address: e.target.value })}
          />
        </Field>
      </div>
    </FormSection>
  )
}