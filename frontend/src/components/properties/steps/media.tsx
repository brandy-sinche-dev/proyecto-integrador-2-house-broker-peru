import { Field } from '../../../components/Field'
import { TextInput } from '../../../components/TextInput'
import { FormSection } from './FormSection'

export interface MediaData {
  link_planos: string
  link_galeria: string
}

interface FormStepMediaProps {
  data: MediaData
  onChange: (data: MediaData) => void
}

export function FormStepMedia({ data, onChange }: FormStepMediaProps) {
  return (
    <FormSection
      step={3}
      title="Multimedia y planos"
      subtitle="Fotos, recorrido virtual y planos del inmueble"
    >
      <div className="hform-grid">
        <Field label="Link de galería (fotos)">
          <TextInput
            placeholder="Ej. https://drive.google.com/…"
            value={data.link_galeria}
            onChange={(e) => onChange({ ...data, link_galeria: e.target.value })}
          />
        </Field>
        <Field label="Link de planos">
          <TextInput
            placeholder="Ej. https://drive.google.com/…"
            value={data.link_planos}
            onChange={(e) => onChange({ ...data, link_planos: e.target.value })}
          />
        </Field>
        <div className="hform-grid__full hform-dropzone">
          <svg className="hform-dropzone__icon" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="9" cy="10" r="1.6" fill="currentColor" />
            <path d="m5 17 4-4 3 3 3-3 4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          <p className="hform-dropzone__title">Arrastra tus fotografías aquí</p>
          <p className="hform-dropzone__hint">{data.link_galeria ? 'Tienes un link de galería configurado' : 'Se habilitará el upload en la próxima fase'}</p>
        </div>
      </div>
    </FormSection>
  )
}