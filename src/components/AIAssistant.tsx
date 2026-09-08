import { useCallback, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { hoyISO } from '../utils/date';
import type { Quadrant } from '../types';

const GEMINI_KEY_LS = 'organizador.geminiKey';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

function buildSystemPrompt(tasksSummary: string): string {
  return `Eres un asistente de productividad integrado en una app de organización de tareas.
El usuario tiene estas tareas pendientes:
${tasksSummary}

Hoy es ${hoyISO()}.

Puedes ayudar al usuario con:
- Sugerir cómo priorizar sus tareas
- Crear nuevas tareas (responde con JSON: {"accion":"crear","tareas":[{"titulo":"...","fecha":"YYYY-MM-DD","inicio":"HH:MM","fin":"HH:MM","quadrant":"Q1|Q2|Q3|Q4"}]})
- Consejos de productividad y gestión del tiempo
- Reorganizar su agenda del día
- Sugerir descansos o ajustes en el pomodoro

Responde siempre en español y de forma concisa. Si el usuario pide crear tareas, incluye el JSON al final de tu respuesta.`;
}

async function chatWithGemini(apiKey: string, messages: Message[], systemPrompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Entendido. Soy tu asistente de productividad. ¿En qué te puedo ayudar?' }] },
    ...messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    })),
  ];

  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });
    if (res.status !== 503) break;
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }

  if (!res || !res.ok) {
    if (res?.status === 503) throw new Error('Gemini está saturado. Inténtalo en unos segundos.');
    if (res?.status === 400) throw new Error('API key inválida');
    throw new Error(`Error ${res?.status}`);
  }

  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sin respuesta';
}

export function AIAssistant() {
  const { state, dispatch, showToast } = useApp();

  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem(GEMINI_KEY_LS) ?? ''; } catch { return ''; }
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const guardarKey = (key: string) => {
    setApiKey(key);
    try { localStorage.setItem(GEMINI_KEY_LS, key); } catch { /* */ }
  };

  const tasksSummary = state.tareas
    .filter((t) => !t.hecha)
    .slice(0, 20)
    .map((t) => `- ${t.titulo}${t.fecha ? ` (${t.fecha})` : ''}${t.inicio ? ` ${t.inicio}-${t.fin}` : ''} [${t.quadrant}] ${t.estPomos}🍅`)
    .join('\n');

  const procesarRespuesta = useCallback((text: string) => {
    const jsonMatch = text.match(/\{"accion"\s*:\s*"crear"\s*,\s*"tareas"\s*:\s*\[[\s\S]*?\]\s*\}/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[0]);
        if (data.accion === 'crear' && Array.isArray(data.tareas)) {
          let count = 0;
          for (const t of data.tareas) {
            if (!t.titulo?.trim()) continue;
            dispatch({
              type: 'ADD_TASK',
              input: {
                titulo: t.titulo.trim(),
                fecha: t.fecha || hoyISO(),
                inicio: t.inicio || '',
                fin: t.fin || '',
                estPomos: t.estPomos || 1,
                quadrant: (t.quadrant as Quadrant) || 'Q2',
                miDia: t.fecha === hoyISO(),
              },
            });
            count++;
          }
          if (count > 0) showToast(`${count} tarea${count !== 1 ? 's' : ''} creada${count !== 1 ? 's' : ''}`);
        }
      } catch { /* ignore parse errors */ }
    }
  }, [dispatch, showToast]);

  const enviar = async () => {
    const msg = input.trim();
    if (!msg || !apiKey.trim()) return;

    setError('');
    const newMessages: Message[] = [...messages, { role: 'user', text: msg }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);

    try {
      const respuesta = await chatWithGemini(apiKey.trim(), newMessages, buildSystemPrompt(tasksSummary));
      const cleanResp = respuesta.replace(/\{"accion"\s*:\s*"crear"\s*,\s*"tareas"\s*:\s*\[[\s\S]*?\]\s*\}/, '').trim();
      procesarRespuesta(respuesta);
      setMessages([...newMessages, { role: 'assistant', text: cleanResp || respuesta }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al conectar con Gemini');
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
    }
  };

  const quickActions = [
    '¿Cómo debería priorizar mis tareas de hoy?',
    'Organiza mi agenda de mañana',
    'Dame consejos de productividad',
    'Sugiere descansos entre mis tareas',
  ];

  return (
    <section className="view active" id="viewAssistant">
      <header className="main-header">
        <div>
          <h1>Asistente IA Gemini</h1>
          <p className="subtitle">Tu asistente de productividad con inteligencia artificial</p>
        </div>
        <span className="ia-badge">IA</span>
      </header>

      <div className="ai-container">
        {!apiKey && (
          <div className="ai-key-setup">
            <p>Configura tu API key de Gemini para usar el asistente.</p>
            <div className="ai-key-row">
              <input
                type="password"
                placeholder="Pega tu API key de Google AI Studio"
                value={apiKey}
                onChange={(e) => guardarKey(e.target.value)}
              />
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                Obtener key
              </a>
            </div>
          </div>
        )}

        <div className="ai-messages" ref={scrollRef}>
          {messages.length === 0 && apiKey && (
            <div className="ai-welcome">
              <div className="ai-welcome-icon">🤖</div>
              <h3>¡Hola! Soy tu asistente de productividad</h3>
              <p>Puedo ayudarte a organizar tus tareas, priorizar tu día y darte consejos de productividad.</p>
              <div className="ai-quick-actions">
                {quickActions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="ai-quick-btn"
                    onClick={() => { setInput(q); }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`ai-msg ai-msg-${m.role}`}>
              <span className="ai-msg-avatar">{m.role === 'user' ? '👤' : '🤖'}</span>
              <div className="ai-msg-text">{m.text}</div>
            </div>
          ))}

          {loading && (
            <div className="ai-msg ai-msg-assistant">
              <span className="ai-msg-avatar">🤖</span>
              <div className="ai-msg-text ai-typing">Pensando...</div>
            </div>
          )}
        </div>

        {error && <p className="ai-error">{error}</p>}

        <div className="ai-input-bar">
          <input
            type="text"
            placeholder={apiKey ? 'Escribe tu mensaje...' : 'Configura tu API key primero'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            disabled={!apiKey || loading}
          />
          <button
            type="button"
            className="primary ai-send"
            onClick={enviar}
            disabled={!apiKey || loading || !input.trim()}
          >
            {loading ? '...' : '➤'}
          </button>
        </div>
      </div>
    </section>
  );
}
