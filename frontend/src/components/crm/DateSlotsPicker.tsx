import React from 'react';

interface DateSlotsPickerProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedTime: string;
  setSelectedTime: (time: string) => void;
}

export const DateSlotsPicker: React.FC<DateSlotsPickerProps> = ({
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
}) => {
  const availableSlots = ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM"];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <label>1. Selecciona una fecha:</label>
      <input 
        type="date" 
        value={selectedDate} 
        onChange={(e) => setSelectedDate(e.target.value)} 
        required 
      />

      <label>2. Horarios disponibles:</label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {availableSlots.map((slot) => (
          <button
            key={slot}
            type="button"
            style={{
              padding: '8px 12px',
              backgroundColor: selectedTime === slot ? '#007bff' : '#f0f0f0',
              color: selectedTime === slot ? '#fff' : '#000',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onClick={() => setSelectedTime(slot)}
          >
            {slot}
          </button>
        ))}
      </div>
    </div>
  );
};