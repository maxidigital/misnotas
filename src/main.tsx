import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App';
import '@fontsource/fira-code/400.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster position="bottom-right" richColors closeButton />
  </React.StrictMode>
);
