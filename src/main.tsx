import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { routerBasename } from './lib/withBase';
import './index.css';

const el = document.getElementById('root');
if (!el) throw new Error('Missing #root');

createRoot(el).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename()}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
