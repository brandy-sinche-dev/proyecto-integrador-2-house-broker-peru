import React, { useEffect, useRef, useState } from 'react';
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

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const fetchErrorMessage = 'No se pudieron cargar los horarios. Inténtalo de nuevo.';
const submitErrorMessage = 'No se pudo confirmar la reserva. Inténtalo de nuevo.';

interface DialogFrameProps {
  labelledBy: string;
  describedBy: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Envoltorio accesible del modal: atrapa el foco dentro del diálogo, cierra
 * con Escape o con un clic en el fondo y devuelve el foco al disparador al
 * desmontarse. Se comparte entre la vista de reserva y la de "inicia sesión".
 */
const DialogFrame: React.FC<DialogFrameProps> = ({ labelledBy, describedBy, onClose, children }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = document.activeElement;
    const dialog = dialogRef.current;
    const preferred = dialog?.querySelector<HTMLElement>('#appointment-date');
    const first = dialog?.querySelector<HTMLElement>(FOCUSABLE);
    (preferred ?? first)?.focus();

    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div style={overlayStyle} role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        style={modalStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>
  );
};

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
      <DialogFrame
        labelledBy="appointment-login-title"
        describedBy="appointment-login-desc"
        onClose={onClose}
      >
        <h3 id="appointment-login-title">Inicia sesión requerida</h3>
        <p id="appointment-login-desc">
          Debes iniciar sesión para agendar una visita a este inmueble.
        </p>
        <button type="button" onClick={onClose}>Cerrar</button>
      </DialogFrame>
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
    <DialogFrame
      labelledBy="appointment-title"
      describedBy="appointment-property"
      onClose={onClose}
    >
      <button type="button" onClick={onClose} style={{ float: 'right' }} aria-label="Cerrar">
        <span aria-hidden="true">X</span>
      </button>

      {isSuccess ? (
        <SuccessToast date={selectedDate} time={formatSlotTime(selectedTime)} onClose={onClose} />
      ) : (
        <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <h2 id="appointment-title">Reservar Visita</h2>
          <p id="appointment-property"><strong>{propertyTitle}</strong></p>

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
            <p role="status" aria-live="polite" style={errorStyle}>{submitError}</p>
          )}

          <button
            type="submit"
            disabled={!selectedDate || !selectedTime || isSubmitting}
            aria-busy={isSubmitting}
            style={{ marginTop: '16px', padding: '10px 20px', width: '100%' }}
          >
            {isSubmitting ? 'Confirmando…' : 'Confirmar Reserva'}
          </button>
        </form>
      )}
    </DialogFrame>
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
