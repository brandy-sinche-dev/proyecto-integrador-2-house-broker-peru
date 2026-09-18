import { useState } from 'react'
import { createProperty, updateProperty } from '../../services/properties'
import { getErrorMessage } from '../../services/errors'
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

type ErrorKey =
  | keyof BasicData
  | keyof FeaturesData
  | 'price'

type Errors = Partial<Record<ErrorKey, string>>

export interface UsePropertyFormOptions {
  property?: Property
  onSaved: () => void
}

/** '12' -> 12 ; '' -> undefined ; texto no numérico -> undefined */
function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const n = Number(trimmed)
  return Number.isNaN(n) ? undefined : n
}

function isBlank(value: string): boolean {
  return value.trim() === ''
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
    area_total: property?.area_total != null ? String(property.area_total) : '',
    area_construida: property?.area_construida != null ? String(property.area_construida) : '',
    dormitorios: property?.dormitorios != null ? String(property.dormitorios) : '',
    banos: property?.banos != null ? String(property.banos) : '',
    estacionamientos: property?.estacionamientos != null ? String(property.estacionamientos) : '',
  })
  const [media, setMedia] = useState<MediaData>({
    link_planos: property?.link_planos ?? '',
    link_galeria: property?.link_galeria ?? '',
  })
  const [pricing, setPricing] = useState<PricingData>({
    price: property ? String(property.price) : '',
    moneda: property?.moneda ?? 'PEN',
    negociable: property?.negociable ?? false,
    destacado: property?.destacado ?? false,
  })
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isEdit = Boolean(property)

  const validateBasic = (): Errors => {
    const next: Errors = {}
    if (isBlank(basic.title)) next.title = 'El título es obligatorio.'
    if (isBlank(basic.address)) next.address = 'La dirección es obligatoria.'
    if (!basic.property_type) next.property_type = 'Selecciona un tipo de propiedad.'
    return next
  }

  const validateFeatures = (): Errors => {
    const next: Errors = {}
    for (const field of [
      'area_total',
      'area_construida',
      'dormitorios',
      'banos',
      'estacionamientos',
    ] as const) {
      const raw = features[field]
      if (isBlank(raw)) continue
      const n = Number(raw.trim())
      if (Number.isNaN(n) || n < 0) {
        next[field] = 'Debe ser un número mayor o igual a 0.'
      }
    }
    return next
  }

  const validatePrice = (): string | undefined => {
    if (isBlank(pricing.price)) return 'El precio es obligatorio.'
    const price = Number(pricing.price)
    if (Number.isNaN(price) || price <= 0) return 'El precio debe ser un número mayor a 0.'
    return undefined
  }

  const goNext = () => {
    let next: Errors = {}
    if (step === 0) {
      next = validateBasic()
      setErrors(next)
    } else if (step === 1) {
      next = validateFeatures()
      setErrors(next)
    }
    if (Object.values(next).some(Boolean)) return
    setStep((s) => Math.min(s + 1, FORM_STEPS.length - 1))
  }

  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const submit = () => {
    const priceError = validatePrice()
    if (priceError) {
      setErrors((prev) => ({ ...prev, price: priceError }))
      setStep(FORM_STEPS.length - 1)
      return
    }

    const input: PropertyInput = {
      title: basic.title.trim(),
      address: basic.address.trim(),
      price: Number(pricing.price),
      moneda: pricing.moneda as Moneda,
      mode,
      property_type: basic.property_type as PropertyType,
      area_total: toOptionalNumber(features.area_total),
      area_construida: toOptionalNumber(features.area_construida),
      dormitorios: toOptionalNumber(features.dormitorios),
      banos: toOptionalNumber(features.banos),
      estacionamientos: toOptionalNumber(features.estacionamientos),
      link_planos: media.link_planos.trim() === '' ? undefined : media.link_planos.trim(),
      link_galeria: media.link_galeria.trim() === '' ? undefined : media.link_galeria.trim(),
      negociable: pricing.negociable,
      destacado: pricing.destacado,
    }

    setSaving(true)
    setSubmitError(null)
    const action = isEdit && property ? updateProperty(property.id, input) : createProperty(input)
    action
      .then(onSaved)
      .catch((err) => {
        setSubmitError(getErrorMessage(err, 'No se pudo guardar la propiedad.'))
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
    setErrors,
    saving,
    submitError,
    goNext,
    goBack,
    submit,
  }
}

export type { Errors as PropertyFormErrors }