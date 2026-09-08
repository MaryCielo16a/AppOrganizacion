import { useCallback, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { hoyISO } from '../utils/date';
import { getGeminiKey } from '../utils/gemini';
import type { Quadrant } from '../types';

interface ExtractedTask {
  titulo: string;
  fecha: string;
  inicio: string;
  fin: string;
  estPomos: number;
  quadrant: Quadrant;
}

function estimarPomos(inicio: string, fin: string): number {
  if (!inicio || !fin) return 1;
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins <= 0) return 1;
  return Math.max(1, Math.round(mins / 25));
}

async function extraerConGemini(apiKey: string, base64: string, mimeType: string): Promise<ExtractedTask[]> {
  const hoy = hoyISO();
  const prompt = `Analiza esta imagen y extrae todas las tareas, actividades o eventos que veas.
Devuelve SOLO un array JSON válido (sin markdown, sin backticks) con este formato exacto:
[
  {
    "titulo": "nombre de la tarea",
    "fecha": "${hoy}",
    "inicio": "HH:MM",
    "fin": "HH:MM"
  }
]
Reglas:
- Si ves horas, conviértelas a formato 24h (HH:MM). Si dice "11 - 1 pm" → inicio "11:00", fin "13:00".
- Si no hay hora visible, deja inicio y fin como cadena vacía "".
- Si no hay fecha visible, usa "${hoy}".
- Extrae TODAS las tareas/actividades visibles.
- El título debe ser descriptivo y en el idioma original de la imagen.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: base64 } },
      ],
    }],
  });

  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    if (res.status !== 503) break;
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }

  if (!res || !res.ok) {
    const err = res ? await res.text() : '';
    if (res?.status === 503) throw new Error('Gemini está saturado. Inténtalo de nuevo en unos segundos.');
    if (res?.status === 400) throw new Error('API key inválida o imagen no soportada');
    throw new Error(`Error ${res?.status}: ${err}`);
  }

  const json = await res.json();
  const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No se pudo parsear la respuesta de Gemini');

  const parsed: Array<{ titulo?: string; fecha?: string; inicio?: string; fin?: string }> = JSON.parse(match[0]);

  return parsed.map((t) => ({
    titulo: t.titulo ?? '',
    fecha: t.fecha ?? hoy,
    inicio: t.inicio ?? '',
    fin: t.fin ?? '',
    estPomos: estimarPomos(t.inicio ?? '', t.fin ?? ''),
    quadrant: 'Q2' as Quadrant,
  }));
}

interface Props {
  onClose: () => void;
}

export function ImageTaskExtractor({ onClose }: Props) {
  const { dispatch, showToast } = useApp();

  const [step, setStep] = useState<'upload' | 'loading' | 'review'>('upload');
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const procesarImagen = useCallback(async (file: File) => {
    const key = getGeminiKey();
    if (!key) {
      setError('Servicio de IA no disponible en este momento');
      return;
    }

    setError('');
    setStep('loading');

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      const base64 = dataUrl.split(',')[1];
      const mimeType = file.type || 'image/jpeg';

      try {
        const extracted = await extraerConGemini(key, base64, mimeType);
        if (extracted.length === 0) {
          setError('No se encontraron tareas en la imagen');
          setStep('upload');
          return;
        }
        setTasks(extracted);
        setStep('review');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al procesar la imagen');
        setStep('upload');
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) procesarImagen(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) procesarImagen(file);
  };

  const updateTask = (idx: number, field: keyof ExtractedTask, value: string | number) => {
    setTasks((prev) => prev.map((t, i) =>
      i === idx ? { ...t, [field]: value } : t,
    ));
  };

  const removeTask = (idx: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const guardarTareas = () => {
    let count = 0;
    for (const t of tasks) {
      if (!t.titulo.trim()) continue;
      dispatch({
        type: 'ADD_TASK',
        input: {
          titulo: t.titulo.trim(),
          fecha: t.fecha,
          inicio: t.inicio,
          fin: t.fin,
          estPomos: t.estPomos,
          quadrant: t.quadrant,
          miDia: t.fecha === hoyISO(),
        },
      });
      count++;
    }
    showToast(`${count} tarea${count !== 1 ? 's' : ''} agregada${count !== 1 ? 's' : ''}`);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal img-extractor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>EXTRAER TAREAS DE IMAGEN</span>
          <button type="button" className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {error && <p className="img-ext-error">{error}</p>}

          {step === 'upload' && (
            <>
              <div className="img-ext-actions">
                <button type="button" className="img-ext-camera-btn" onClick={() => cameraRef.current?.click()}>
                  📸 Tomar foto
                </button>
                <button type="button" className="img-ext-gallery-btn" onClick={() => fileRef.current?.click()}>
                  🖼 Galería
                </button>
              </div>
              <div
                className="img-ext-drop"
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="img-ext-preview" />
                ) : (
                  <>
                    <span className="img-ext-drop-icon">📷</span>
                    <p>O arrastra una imagen aquí</p>
                    <p className="img-ext-hint">Foto de tu horario, agenda o lista de tareas</p>
                  </>
                )}
              </div>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onFileChange}
                hidden
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                hidden
              />
            </>
          )}

          {step === 'loading' && (
            <div className="img-ext-loading">
              <div className="img-ext-spinner" />
              <p>Analizando imagen con Gemini...</p>
            </div>
          )}

          {step === 'review' && (
            <div className="img-ext-review">
              {preview && <img src={preview} alt="Imagen" className="img-ext-thumb" />}
              <p className="img-ext-found">{tasks.length} tarea{tasks.length !== 1 ? 's' : ''} encontrada{tasks.length !== 1 ? 's' : ''}</p>

              <div className="img-ext-list">
                {tasks.map((t, i) => (
                  <div key={i} className="img-ext-task">
                    <div className="img-ext-task-head">
                      <input
                        type="text"
                        value={t.titulo}
                        onChange={(e) => updateTask(i, 'titulo', e.target.value)}
                        className="img-ext-titulo"
                        placeholder="Título de la tarea"
                      />
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Quitar"
                        onClick={() => removeTask(i)}
                      >✕</button>
                    </div>
                    <div className="img-ext-task-fields">
                      <label>
                        Fecha
                        <input type="date" value={t.fecha} onChange={(e) => updateTask(i, 'fecha', e.target.value)} />
                      </label>
                      <label>
                        Inicio
                        <input type="time" value={t.inicio} onChange={(e) => updateTask(i, 'inicio', e.target.value)} />
                      </label>
                      <label>
                        Fin
                        <input type="time" value={t.fin} onChange={(e) => updateTask(i, 'fin', e.target.value)} />
                      </label>
                      <label>
                        🍅
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={t.estPomos}
                          onChange={(e) => updateTask(i, 'estPomos', Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </label>
                      <label>
                        Cuadrante
                        <select value={t.quadrant} onChange={(e) => updateTask(i, 'quadrant', e.target.value)}>
                          <option value="Q1">Q1</option>
                          <option value="Q2">Q2</option>
                          <option value="Q3">Q3</option>
                          <option value="Q4">Q4</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => { setStep('upload'); setTasks([]); }}>
                  Otra imagen
                </button>
                <button type="button" className="primary" onClick={guardarTareas} disabled={tasks.length === 0}>
                  Guardar {tasks.length} tarea{tasks.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
