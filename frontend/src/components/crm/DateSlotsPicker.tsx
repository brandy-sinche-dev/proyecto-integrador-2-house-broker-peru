import React, { useCallback, useMemo } from 'react';
import type { AvailableSlot } from '../../services/types';
import { formatSlotTime } from '../../services/appointments';
import './DateSlotsPicker.css';

/**
 * Horario tal como lo pinta el selector. `is_available` permite representar
 * una franja ya ocupada (por ejemplo, la que acaba de reservar otro usuario)
 * sin ofrecerla como opción.
 */
export interface SlotOption extends AvailableSlot {
  is_available?: boolean;
}

interface DateSlotsPickerProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedTime: string;
  setSelectedTime: (time: string) => void;
  slots?: SlotOption[];
  isLoading?: boolean;
  error?: string | null;
  minDate?: string;
  timezone?: string;
}

const DATE_INPUT_ID = 'appointment-date';
const DATE_LABEL_ID = 'appointment-date-label';
const SKELETON_ITEMS = 4;

interface SlotOptionButtonProps {
  value: string;
  label: string;
  isAvailable: boolean;
  isSelected: boolean;
  isTabbable: boolean;
  onSelect: (value: string) => void;
}

/**
 * Botón de una franja. Se memoiza para que seleccionar una hora solo vuelva
 * a renderizar la opción afectada y no todo el grid.
 */
const SlotOptionButton = React.memo<SlotOptionButtonProps>(
  ({ value, label, isAvailable, isSelected, isTabbable, onSelect }) => (
    <button
      type="button"
      role="option"
      tabIndex={isTabbable ? 0 : -1}
      disabled={!isAvailable}
      aria-selected={isSelected}
      aria-disabled={!isAvailable}
      aria-label={isAvailable ? label : `${label}, horario ocupado`}
      title={isAvailable ? undefined : 'Horario ocupado'}
      className="slots-option"
      style={{
        padding: '8px 12px',
        backgroundColor: isSelected ? '#007bff' : '#f0f0f0',
        color: isSelected ? '#fff' : isAvailable ? '#000' : '#8a8a8a',
        border: '1px solid #ccc',
        borderRadius: '4px',
        cursor: isAvailable ? 'pointer' : 'not-allowed',
        opacity: isAvailable ? 1 : 0.65,
      }}
      onClick={() => {
        if (isAvailable) onSelect(value);
      }}
    >
      {label}
      {!isAvailable && <span aria-hidden="true"> · Ocupado</span>}
    </button>
  ),
);
SlotOptionButton.displayName = 'SlotOptionButton';

/**
 * Placeholder de carga: reproduce la forma del grid de horarios mientras se
 * consulta la disponibilidad, para que el modal no cambie de tamaño.
 */
const SlotsSkeleton: React.FC = () => (
  <div role="status" aria-live="polite" aria-busy="true">
    <span style={srOnlyStyle}>Cargando horarios…</span>
    <div className="slots-skeleton" data-testid="slots-skeleton" aria-hidden="true">
      {Array.from({ length: SKELETON_ITEMS }, (_, index) => (
        <span key={index} className="slots-skeleton__item" />
      ))}
    </div>
  </div>
);

const DateSlotsPickerBase: React.FC<DateSlotsPickerProps> = ({
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  slots = [],
  isLoading = false,
  error = null,
  minDate,
  timezone = 'America/Lima',
}) => {
  const formattedSlots = useMemo(
    () =>
      slots.map((slot) => ({
        ...slot,
        label: formatSlotTime(slot.start_at, timezone),
      })),
    [slots, timezone],
  );

  const { selectedIndex, tabbableIndex } = useMemo(() => {
    const selected = slots.findIndex(
      (slot) => slot.start_at === selectedTime && slot.is_available !== false,
    );
    const firstAvailable = slots.findIndex((slot) => slot.is_available !== false);
    return {
      selectedIndex: selected,
      tabbableIndex: selected >= 0 ? selected : firstAvailable,
    };
  }, [slots, selectedTime]);

  const handleSelect = useCallback(
    (value: string) => setSelectedTime(value),
    [setSelectedTime],
  );

  const handleSlotsKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) return;

    const options = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]:not([disabled])'),
    );
    if (options.length === 0) return;

    event.preventDefault();
    const current = options.indexOf(document.activeElement as HTMLButtonElement);
    let next = current;

    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = current < 0 ? 0 : (current + 1) % options.length;
    } else {
      next = current < 0 ? options.length - 1 : (current - 1 + options.length) % options.length;
    }

    options[next]?.focus();
  }, []);

  const renderSlots = () => {
    if (!selectedDate) {
      return <p style={hintStyle}>Selecciona una fecha para ver los horarios disponibles.</p>;
    }
    if (isLoading) {
      return <SlotsSkeleton />;
    }
    if (error) {
      return (
        <p role="status" aria-live="polite" style={errorStyle}>
          {error}
        </p>
      );
    }
    if (formattedSlots.length === 0) {
      return (
        <p role="status" aria-live="polite" style={hintStyle}>
          No hay horarios disponibles para esta fecha.
        </p>
      );
    }

    return (
      <>
        <p role="status" aria-live="polite" style={srOnlyStyle}>
          {`${formattedSlots.length} horarios disponibles`}
        </p>
        <div
          role="listbox"
          aria-label={`Horarios disponibles para el ${selectedDate}`}
          aria-required="true"
          onKeyDown={handleSlotsKeyDown}
          style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
        >
          {formattedSlots.map((slot, index) => {
            const isAvailable = slot.is_available !== false;
            return (
              <SlotOptionButton
                key={slot.start_at}
                value={slot.start_at}
                label={slot.label}
                isAvailable={isAvailable}
                isSelected={selectedIndex === index}
                isTabbable={index === tabbableIndex}
                onSelect={handleSelect}
              />
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <label id={DATE_LABEL_ID} htmlFor={DATE_INPUT_ID}>1. Selecciona una fecha:</label>
      <input
        id={DATE_INPUT_ID}
        type="date"
        value={selectedDate}
        min={minDate}
        aria-labelledby={DATE_LABEL_ID}
        aria-required="true"
        onChange={(e) => setSelectedDate(e.target.value)}
        required
      />

      <span>2. Horarios disponibles:</span>
      {renderSlots()}
    </div>
  );
};

/**
 * El selector solo se re-renderiza cuando cambian sus props; el modal lo
 * mantiene memoizado con callbacks estables para evitar trabajo al confirmar
 * o al mostrar un error.
 */
export const DateSlotsPicker = React.memo(DateSlotsPickerBase);
DateSlotsPicker.displayName = 'DateSlotsPicker';

const hintStyle: React.CSSProperties = {
  margin: 0,
  color: '#555',
  fontSize: '0.9rem',
};

const errorStyle: React.CSSProperties = {
  margin: 0,
  color: '#b00020',
  fontSize: '0.9rem',
};

const srOnlyStyle: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};
