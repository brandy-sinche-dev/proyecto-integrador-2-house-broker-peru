import { useState } from 'react'
import { createProperty, updateProperty } from '../../services/properties'
import type {
  Moneda,
  Property,
  PropertyInput,
  PropertyType,
  TransactionMode,
} from '../../services/types'
import type { BasicData } from './steps/basic'
import type { FeaturesData } from './steps/features'
import type { MediaData } from './steps/media'
import type { PricingData } from './steps/pricing'

export const FORM_STEPS = [
  { id: 'basic', label: 'Básicos y ubicación' },
  { id: 'features', label: 'Datos físicos y métricas' },
  { id: 'media', label: 'Multimedia y planos' },
  { id: 'pricing', label: 'Precio y cierre' },
]

type Errors = Partial<Record<keyof BasicData, string>>

export interface UsePropertyFormOptions {
  property?: Property
  onSaved: () => void
}

export function usePropertyForm({ property, onSaved }: UsePropertyFormOptions) {
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<TransactionMode>(property?.mode ?? 'VENTA')
  const [basic, setBasic] = useState<BasicData>({
    title: property?.title ?? '',
    address: property?.address ?? '',
    property_type: property?.property_type ?? '',
  })
  const [features, setFeatures] = useState<FeaturesData>({
    area_total: '',
    area_construida: '',
    dormitorios: '',
    banos: '',
    estacionamientos: '',
  })
  const [media, setMedia] = useState<MediaData>({
    link_planos: '',
    link_galeria: '',
  })
  const [pricing, setPricing] = useState<PricingData>({
    price: property ? String(property.price) : '',
    moneda: property?.moneda ?? 'PEN',
    negociable: false,
    destacado: false,
  })
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isEdit = Boolean(property)

  const validateBasic = (): Errors => {
    const next: Errors = {}
    if (!basic.title.trim()) next.title = 'El título es obligatorio.'
    if (!basic.address.trim()) next.address = 'La dirección es obligatoria.'
    if (!basic.property_type) next.property_type = 'Selecciona un tipo de propiedad.'
    return next
  }

  const goNext = () => {
    if (step === 0) {
      const next = validateBasic()
      setErrors(next)
      if (Object.values(next).some(Boolean)) return
    }
    setStep((s) => Math.min(s + 1, FORM_STEPS.length - 1))
  }

  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const submit = () => {
    const price = Number(pricing.price)
    if (pricing.price === '' || Number.isNaN(price) || price < 0) {
      setStep(FORM_STEPS.length - 1)
      return
    }

    const input: PropertyInput = {
      title: basic.title.trim(),
      address: basic.address.trim(),
      price,
      moneda: pricing.moneda as Moneda,
      mode,
      property_type: basic.property_type as PropertyType,
    }

    setSaving(true)
    setSubmitError(null)
    const action = isEdit && property ? updateProperty(property.id, input) : createProperty(input)
    action
      .then(onSaved)
      .catch((err) => {
        setSubmitError(err?.message ?? 'No se pudo guardar la propiedad.')
        setSaving(false)
      })
  }

  return {
    step,
    isLast: step === FORM_STEPS.length - 1,
    isEdit,
    mode,
    setMode,
    basic,
    setBasic,
    features,
    setFeatures,
    media,
    setMedia,
    pricing,
    setPricing,
    errors,
    saving,
    submitError,
    goNext,
    goBack,
    submit,
  }
}