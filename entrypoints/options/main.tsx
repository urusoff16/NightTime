import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './options.css';

const root = document.getElementById('root');

if (root === null) {
  throw new Error('Не найден корневой элемент страницы настроек.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
