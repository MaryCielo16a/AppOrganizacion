import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './store/AppContext';
import { App } from './App';
import './styles.css';

const contenedor = document.getElementById('root');
if (!contenedor) throw new Error('No se encontró el elemento #root');

createRoot(contenedor).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js');
}
