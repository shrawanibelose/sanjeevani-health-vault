import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Performance monitoring
reportWebVitals();

// 🚀 CRITICAL FIX: UNREGISTER SERVICE WORKER
// This code forces the browser to kill the old cache that is causing the blank screen.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for (let registration of registrations) {
      registration.unregister().then(() => {
        console.log('🗑️ Old Service Worker removed. Fresh code loading...');
      });
    }
  });
}