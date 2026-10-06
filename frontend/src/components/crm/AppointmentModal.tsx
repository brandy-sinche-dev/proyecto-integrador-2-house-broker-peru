import React, { useState, useEffect } from 'react';
import { DateSlotsPicker } from './DateSlotsPicker';
import { SuccessToast } from './SuccessToast';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyTitle?: string;
  isLoggedIn?: boolean;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  propertyTitle = "Inmueble seleccionado",
  isLoggedIn = true,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setSelectedDate('');
      setSelectedTime('');
    }
  }, [isOpen, propertyTitle]);

  if (!isOpen) return null;

  if (!isLoggedIn) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <h3>Inicia sesión requerida</h3>
          <p>Debes iniciar sesión para agendar una visita a este inmueble.</p>
          <button onClick={onClose}>Cerrar</button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDate && selectedTime) {
      setIsSuccess(true);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button onClick={onClose} style={{ float: 'right' }}>X</button>
        
        {isSuccess ? (
          <SuccessToast date={selectedDate} time={selectedTime} onClose={onClose} />
        ) : (
          <form onSubmit={handleSubmit}>
            <h2>Reservar Visita</h2>
            <p><strong>{propertyTitle}</strong></p>

            <DateSlotsPicker 
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
            />

            <button 
              type="submit" 
              disabled={!selectedDate || !selectedTime}
              style={{ marginTop: '16px', padding: '10px 20px', width: '100%' }}
            >
              Confirmar Reserva
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '400px', width: '100%'
};