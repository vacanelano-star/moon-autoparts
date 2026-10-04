import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import logoUrl from '../logo.png';

const favicon = document.querySelector('link[rel="icon"]');
if (favicon) favicon.href = logoUrl;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
