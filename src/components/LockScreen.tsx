import { useState, useRef, useEffect } from 'react';

interface Props {
  onUnlock: () => void;
  pin: string;
}

const PIN_LENGTH = 4;

export function LockScreen({ onUnlock, pin }: Props) {
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setEntered(digits);
    setError(false);

    if (digits.length === PIN_LENGTH) {
      if (digits === pin) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setEntered('');
          setError(false);
          inputRef.current?.focus();
        }, 600);
      }
    }
  };

  const handleDot = (i: number) => {
    inputRef.current?.focus();
    return i < entered.length;
  };

  return (
    <div className="lock-backdrop" onClick={() => inputRef.current?.focus()}>
      <div className="lock-card">
        <div className="lock-icon">🔒</div>
        <h2 className="lock-title">App bloqueada</h2>
        <p className="lock-subtitle">Ingresa tu PIN para continuar</p>

        <div className={`lock-dots${error ? ' shake' : ''}`}>
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <div key={i} className={`lock-dot${handleDot(i) ? ' filled' : ''}`} />
          ))}
        </div>

        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          className="lock-hidden-input"
          value={entered}
          onChange={(e) => handleChange(e.target.value)}
          maxLength={PIN_LENGTH}
          aria-label="PIN de desbloqueo"
        />

        {error && <p className="lock-error">PIN incorrecto</p>}
      </div>
    </div>
  );
}
