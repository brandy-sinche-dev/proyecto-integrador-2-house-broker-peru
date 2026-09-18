import { Field } from '../../../components/Field'
import { TextInput } from '../../../components/TextInput'
import { FormSection } from './FormSection'

export interface FeaturesData {
  area_total: string
  area_construida: string
  dormitorios: string
  banos: string
  estacionamientos: string
}

type FeaturesErrors = Partial<Record<keyof FeaturesData, string>>

interface FormStepFeaturesProps {
  data: FeaturesData
  onChange: (data: FeaturesData) => void
  errors?: FeaturesErrors
}

export function FormStepFeatures({ data, onChange, errors }: FormStepFeaturesProps) {
  return (
    <FormSection
      step={2}
      title="Datos físicos y métricas"
      subtitle="Dimensiones que describen tu propiedad"
    >
      <div className="hform-grid">
        <Field label="Área total (m²)" error={errors?.area_total}>
          <TextInput
            type="number"
            min={0}
            placeholder="Ej. 120"
            value={data.area_total}
            invalid={Boolean(errors?.area_total)}
            onChange={(e) => onChange({ ...data, area_total: e.target.value })}
          />
        </Field>
        <Field label="Área construida (m²)" error={errors?.area_construida}>
          <TextInput
            type="number"
            min={0}
            placeholder="Ej. 95"
            value={data.area_construida}
            invalid={Boolean(errors?.area_construida)}
            onChange={(e) => onChange({ ...data, area_construida: e.target.value })}
          />
        </Field>
        <Field label="Dormitorios" error={errors?.dormitorios}>
          <TextInput
            type="number"
            min={0}
            placeholder="Ej. 3"
            value={data.dormitorios}
            invalid={Boolean(errors?.dormitorios)}
            onChange={(e) => onChange({ ...data, dormitorios: e.target.value })}
          />
        </Field>
        <Field label="Baños" error={errors?.banos}>
          <TextInput
            type="number"
            min={0}
            placeholder="Ej. 2"
            value={data.banos}
            invalid={Boolean(errors?.banos)}
            onChange={(e) => onChange({ ...data, banos: e.target.value })}
          />
        </Field>
        <Field label="Estacionamientos" error={errors?.estacionamientos}>
          <TextInput
            type="number"
            min={0}
            placeholder="Ej. 1"
            value={data.estacionamientos}
            invalid={Boolean(errors?.estacionamientos)}
            onChange={(e) => onChange({ ...data, estacionamientos: e.target.value })}
          />
        </Field>
      </div>
    </FormSection>
  )
}