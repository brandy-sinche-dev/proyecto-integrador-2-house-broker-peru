// Auditoría automatizada AXE DevTools (axe-core) sobre los componentes de
// disponibilidad. Nivel A y AA: jest-axe ya filtra por impacto
// critical/serious, que es donde caen las violaciones WCAG A/AA.
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { PropertyStatusSelector } from './PropertyStatusSelector'
import { ScheduleManager } from './ScheduleManager'

jest.mock('../../services/availability', () => ({
  ...jest.requireActual('../../services/availability'),
  replacePropertySchedules: jest.fn(),
  updatePropertyStatus: jest.fn(),
}))

expect.extend(toHaveNoViolations)

const ALL_DAYS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']

const schedules = {
  property_id: 'prop-1',
  timezone: 'America/Lima',
  total_slots: 1,
  days: ALL_DAYS.map((weekday) => ({
    weekday,
    slots:
      weekday === 'LUNES'
        ? [{ id: 'slot-1', start_time: '09:00', end_time: '10:00', is_active: true }]
        : [],
  })),
}

// jsdom no calcula layout ni color real: contrast falla siempre.
const axeConfig = {
  rules: {
    'color-contrast': { enabled: false },
  },
}

describe('AXE DevTools (A/AA)', () => {
  it('PropertyStatusSelector no tiene violaciones', async () => {
    const { container } = render(
      <PropertyStatusSelector propertyId="prop-1" status="DISPONIBLE" onChanged={jest.fn()} />,
    )
    const results = await axe(container, axeConfig)
    expect(results).toHaveNoViolations()
  })

  it('ScheduleManager no tiene violaciones', async () => {
    const { container } = render(
      <ScheduleManager propertyId="prop-1" schedules={schedules} status="DISPONIBLE" onSaved={jest.fn()} />,
    )
    const results = await axe(container, axeConfig)
    expect(results).toHaveNoViolations()
  })
})
