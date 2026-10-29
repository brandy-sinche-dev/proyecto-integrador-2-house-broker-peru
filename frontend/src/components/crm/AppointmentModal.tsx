import React, { useEffect, useState } from 'react';
import { DateSlotsPicker, type SlotOption } from './DateSlotsPicker';
import { SuccessToast } from './SuccessToast';
import { createAppointment, formatSlotTime, getAvailableSlots } from '../../services/appointments';
import { getErrorMessage } from '../../services/errors';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmed: () => void;
  propertyId?: string;
  propertyTitle?: string;
  isLoggedIn?: boolean;
}

const fetchErrorMessage = 'No se pudieron cargar los horarios. Inténtalo de nuevo.';
const submitErrorMessage = 'No se pudo confirmar la reserva. Inténtalo de nuevo.';

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  onConfirmed,
  propertyId,
  propertyTitle = "Inmueble seleccionado",
  isLoggedIn = true,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !isLoggedIn || !selectedDate) return;

    if (!propertyId) {
      setSlots([]);
      setFetchError('No se pudo identificar el inmueble para agendar la visita.');
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setFetchError(null);

    getAvailableSlots(propertyId, selectedDate)
      .then((availability) => {
        if (!cancelled) setSlots(availability.slots);
      })
      .catch((error) => {
        if (cancelled) return;
        setSlots([]);
        setFetchError(getErrorMessage(error, fetchErrorMessage));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, isLoggedIn, propertyId, selectedDate]);

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

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    setSlots([]);
    setFetchError(null);
    setSubmitError(null);
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || isSubmitting) return;

    if (!propertyId) {
      setSubmitError('No se pudo identificar el inmueble para agendar la visita.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await createAppointment({ property_id: propertyId, scheduled_at: selectedTime });
      setIsSuccess(true);
      onConfirmed();
    } catch (error) {
      setSubmitError(getErrorMessage(error, submitErrorMessage));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle} role="dialog" aria-modal="true" aria-labelledby="appointment-title">
        <button onClick={onClose} style={{ float: 'right' }}>X</button>

        {isSuccess ? (
          <SuccessToast date={selectedDate} time={formatSlotTime(selectedTime)} onClose={onClose} />
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 id="appointment-title">Reservar Visita</h2>
            <p><strong>{propertyTitle}</strong></p>

            <DateSlotsPicker
              selectedDate={selectedDate}
              setSelectedDate={handleDateChange}
              selectedTime={selectedTime}
              setSelectedTime={handleTimeChange}
              slots={slots}
              isLoading={isLoading}
              error={fetchError}
            />

            {submitError && (
              <p role="alert" style={errorStyle}>{submitError}</p>
            )}

            <button
              type="submit"
              disabled={!selectedDate || !selectedTime || isSubmitting}
              style={{ marginTop: '16px', padding: '10px 20px', width: '100%' }}
            >
              {isSubmitting ? 'Confirmando…' : 'Confirmar Reserva'}
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

const errorStyle: React.CSSProperties = {
  margin: '12px 0 0',
  color: '#b00020',
  fontSize: '0.9rem',
};
