import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './utils/axiosConfig'; // Import axios configuration
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

// Dev: suppress noisy ResizeObserver loop errors in some browsers when charts/tables resize
if (process.env.NODE_ENV !== 'production') {
  const ignoreMessages = [
    'ResizeObserver loop completed with undelivered notifications.'
  ];
  const origConsoleError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === 'string' && ignoreMessages.some(msg => args[0].includes(msg))) {
      return; // swallow
    }
    origConsoleError(...args);
  };
}
