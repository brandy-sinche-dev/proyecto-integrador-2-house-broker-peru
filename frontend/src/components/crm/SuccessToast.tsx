import React from 'react';

interface SuccessToastProps {
  date: string;
  time: string;
  onClose: () => void;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({ date, time, onClose }) => {
  return (
    <div style={{ textAlign: 'center', padding: '16px' }}>
      <h3 style={{ color: 'green' }}>🎉 ¡Visita Agendada con Éxito!</h3>
      <p>Tu cita para el <strong>{date}</strong> a las <strong>{time}</strong> ha sido confirmada.</p>
      <button onClick={onClose} style={{ padding: '8px 16px', marginTop: '12px' }}>
        Aceptar
      </button>
    </div>
  );
};