import { useState } from 'react';

interface Step {
  icon: string;
  title: string;
  description: string;
  tip?: string;
}

const STEPS: Step[] = [
  {
    icon: '👋',
    title: '¡Bienvenido a Mi Organizador!',
    description:
      'Tu espacio personal para organizar tareas, gestionar tu tiempo y alcanzar tus metas. Te mostramos las herramientas que tienes disponibles.',
  },
  {
    icon: '✅',
    title: 'Mi día — Tus tareas',
    description:
      'Agrega tareas con título, hora, fecha y prioridad. Se organizan automáticamente en tu calendario cuando les asignas una hora.',
    tip: 'Usa la barra inferior para crear tareas rápidamente.',
  },
  {
    icon: '📷',
    title: 'Desde foto — Extrae tareas',
    description:
      'Sube una foto de tu horario, agenda o lista de tareas y la inteligencia artificial extraerá las actividades automáticamente.',
    tip: 'Necesitas una API key gratuita de Google AI Studio.',
  },
  {
    icon: '📅',
    title: 'Calendario',
    description:
      'Visualiza tus actividades por día, semana o mes. Las tareas con hora aparecen como bloques de tiempo en tu calendario.',
    tip: 'Puedes cambiar entre vista diaria, semanal y mensual.',
  },
  {
    icon: '🍅',
    title: 'Pomodoro',
    description:
      'Técnica de enfoque: trabaja 25 minutos y descansa 5. Después de 4 ciclos, toma un descanso largo. Ideal para mantener la concentración.',
    tip: 'Presiona Espacio para iniciar o pausar el temporizador.',
  },
  {
    icon: '⚡',
    title: 'Matriz de Eisenhower',
    description:
      'Prioriza tus tareas en 4 cuadrantes: urgente e importante (hacer ya), importante pero no urgente (planificar), urgente pero no importante (delegar) y ni urgente ni importante (eliminar).',
    tip: 'Asigna un cuadrante a cada tarea al crearla.',
  },
  {
    icon: '🎯',
    title: 'Áreas y Metas',
    description:
      'Organiza tu vida en áreas (estudios, trabajo, salud...) y define metas específicas con fecha límite para cada una.',
    tip: 'Vincula tareas a un área para ver tu progreso.',
  },
  {
    icon: '🚀',
    title: '¡Listo para comenzar!',
    description:
      'Ya conoces todas las herramientas. Empieza agregando tu primera tarea o sube una foto de tu horario.',
  },
];

interface Props {
  userName: string;
  onComplete: () => void;
}

export function OnboardingGuide({ userName, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onComplete(); }}>
      <div className="modal onboarding-modal" onClick={(e) => e.stopPropagation()}>
        <div className="onboarding-progress">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`onboarding-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            />
          ))}
        </div>

        <div className="onboarding-content">
          <div className="onboarding-icon">{current.icon}</div>
          <h2 className="onboarding-title">
            {isFirst ? `¡Hola, ${userName}!` : current.title}
          </h2>
          <p className="onboarding-desc">{current.description}</p>
          {current.tip && (
            <p className="onboarding-tip">💡 {current.tip}</p>
          )}
        </div>

        <div className="onboarding-actions">
          {isFirst ? (
            <button type="button" className="ghost-btn" onClick={onComplete}>
              Saltar guía
            </button>
          ) : (
            <button type="button" className="ghost-btn" onClick={() => setStep(step - 1)}>
              ← Anterior
            </button>
          )}
          {isLast ? (
            <button type="button" className="primary" onClick={onComplete}>
              ¡Comenzar!
            </button>
          ) : (
            <button type="button" className="primary" onClick={() => setStep(step + 1)}>
              Siguiente →
            </button>
          )}
        </div>

        <p className="onboarding-step-count">
          {step + 1} / {STEPS.length}
        </p>
      </div>
    </div>
  );
}
