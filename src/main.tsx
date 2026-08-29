import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Development environment configuration check (fails closed, never logs secret values)
if (import.meta.env.DEV) {
  if (!import.meta.env.VITE_FAST2SMS_API_KEY) {
    console.info(
      'ℹ️ [KoparNiti Configuration] VITE_FAST2SMS_API_KEY is not set in .env. SMS pipeline will operate in offline Simulated Delivery mode.'
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
