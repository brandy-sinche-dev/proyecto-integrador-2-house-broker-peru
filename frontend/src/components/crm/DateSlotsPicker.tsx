import React from 'react';
import type { AvailableSlot } from '../../services/types';
import { formatSlotTime } from '../../services/appointments';

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

export const DateSlotsPicker: React.FC<DateSlotsPickerProps> = ({
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
  const renderSlots = () => {
    if (!selectedDate) {
      return <p style={hintStyle}>Selecciona una fecha para ver los horarios disponibles.</p>;
    }
    if (isLoading) {
      return <p role="status" style={hintStyle}>Cargando horarios…</p>;
    }
    if (error) {
      return <p role="alert" style={errorStyle}>{error}</p>;
    }
    if (slots.length === 0) {
      return <p style={hintStyle}>No hay horarios disponibles para esta fecha.</p>;
    }

    return (
      <div
        role="group"
        aria-label="Horarios disponibles"
        style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
      >
        {slots.map((slot) => {
          const isAvailable = slot.is_available !== false;
          const isSelected = selectedTime === slot.start_at;
          const label = formatSlotTime(slot.start_at, timezone);

          return (
            <button
              key={slot.start_at}
              type="button"
              disabled={!isAvailable}
              aria-disabled={!isAvailable}
              aria-pressed={isSelected}
              title={isAvailable ? undefined : 'Horario ocupado'}
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
                if (isAvailable) setSelectedTime(slot.start_at);
              }}
            >
              {label}
              {!isAvailable && <span> · Ocupado</span>}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <label htmlFor={DATE_INPUT_ID}>1. Selecciona una fecha:</label>
      <input
        id={DATE_INPUT_ID}
        type="date"
        value={selectedDate}
        min={minDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        required
      />

      <span>2. Horarios disponibles:</span>
      {renderSlots()}
    </div>
  );
};

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
