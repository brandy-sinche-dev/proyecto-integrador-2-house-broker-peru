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

interface FormStepFeaturesProps {
  data: FeaturesData
  onChange: (data: FeaturesData) => void
}

export function FormStepFeatures({ data, onChange }: FormStepFeaturesProps) {
  return (
    <FormSection
      step={2}
      title="Datos físicos y métricas"
      subtitle="Dimensiones que describen tu propiedad"
    >
      <div className="hform-grid">
        <Field label="Área total (m²)">
          <TextInput
            type="number"
            min={0}
            placeholder="Ej. 120"
            value={data.area_total}
            onChange={(e) => onChange({ ...data, area_total: e.target.value })}
          />
        </Field>
        <Field label="Área construida (m²)">
          <TextInput
            type="number"
            min={0}
            placeholder="Ej. 95"
            value={data.area_construida}
            onChange={(e) => onChange({ ...data, area_construida: e.target.value })}
          />
        </Field>
        <Field label="Dormitorios">
          <TextInput
            type="number"
            min={0}
            placeholder="Ej. 3"
            value={data.dormitorios}
            onChange={(e) => onChange({ ...data, dormitorios: e.target.value })}
          />
        </Field>
        <Field label="Baños">
          <TextInput
            type="number"
            min={0}
            placeholder="Ej. 2"
            value={data.banos}
            onChange={(e) => onChange({ ...data, banos: e.target.value })}
          />
        </Field>
        <Field label="Estacionamientos">
          <TextInput
            type="number"
            min={0}
            placeholder="Ej. 1"
            value={data.estacionamientos}
            onChange={(e) => onChange({ ...data, estacionamientos: e.target.value })}
          />
        </Field>
      </div>
    </FormSection>
  )
}