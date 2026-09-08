import { useApp } from '../store/AppContext';

export function RoutineView() {
  const { irA } = useApp();

  return (
    <section className="view active" id="viewRoutine">
      <header className="main-header">
        <div>
          <p className="routine-badge">METODOLOGÍA INTEGRADA</p>
          <h1>¿Cómo organizar tu tiempo eficientemente?</h1>
          <p className="subtitle">
            Sigue esta estructura dividida en <strong>Planificación Semanal</strong> (15 minutos) y{' '}
            <strong>Enfoque Diario</strong> (5 minutos).
          </p>
        </div>
      </header>

      <div className="routine-scroll">
        <div className="routine-cards">
          {/* Planificación Semanal */}
          <div className="routine-card">
            <div className="routine-card-head">
              <div className="routine-card-number">1</div>
              <div>
                <h2 className="routine-card-title">Planificación Semanal</h2>
                <p className="routine-card-sub">1 vez por semana</p>
              </div>
              <span className="routine-time-badge">15 min</span>
            </div>

            <div className="routine-steps">
              <div className="routine-step">
                <span className="routine-step-dot" />
                <div>
                  <strong>1. Revisa tus Metas Anuales y Mensuales</strong>
                  <p>Ubica los hitos del mes para tus áreas clave (ej. Estudio, Tesis, Trabajo).</p>
                </div>
              </div>
              <div className="routine-step">
                <span className="routine-step-dot" />
                <div>
                  <strong>2. Desglosa Metas en Actividades Concretas</strong>
                  <p>Define tareas accionables de 1 a 4 pomodoros (ej. "Redactar 2 pág. de Tesis").</p>
                </div>
              </div>
              <div className="routine-step">
                <span className="routine-step-dot" />
                <div>
                  <strong>3. Clasifica en la Matriz Eisenhower</strong>
                  <p>
                    Ubica el 80% de tus actividades en el Cuadrante 2 (Importante / No Urgente).
                  </p>
                </div>
              </div>
            </div>

            <button type="button" className="routine-action" onClick={() => irA('eisenhower')}>
              ⊞ Ir a Matriz Eisenhower
            </button>
          </div>

          {/* Enfoque Diario */}
          <div className="routine-card">
            <div className="routine-card-head">
              <div className="routine-card-number">2</div>
              <div>
                <h2 className="routine-card-title">Enfoque Diario</h2>
                <p className="routine-card-sub">5 min cada mañana</p>
              </div>
              <span className="routine-time-badge accent">5 min</span>
            </div>

            <div className="routine-steps">
              <div className="routine-step">
                <span className="routine-step-dot" />
                <div>
                  <strong>1. Selecciona de 3 a 5 tareas para "Mi Día"</strong>
                  <p>Jala tareas de tu Matriz de Eisenhower a la lista del día.</p>
                </div>
              </div>
              <div className="routine-step">
                <span className="routine-step-dot" />
                <div>
                  <strong>2. Activa tu Temporizador Pomodoro</strong>
                  <p>Ejecuta bloques enfocados de 25 minutos con 0 distracciones.</p>
                </div>
              </div>
              <div className="routine-step">
                <span className="routine-step-dot" />
                <div>
                  <strong>3. Bloquea tu Horario (Time-Blocking)</strong>
                  <p>
                    Asigna horas exactas para tu tarea principal (ej. "tesis 5 – 7 pm").
                  </p>
                </div>
              </div>
            </div>

            <button type="button" className="routine-action accent" onClick={() => irA('miDia')}>
              ☀ Ir a Mi Día
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
