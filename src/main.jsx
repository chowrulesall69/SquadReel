import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

window.storage = {
  get: async (key, shared = true) => {
    try {
      const prefix = shared ? 'sr_s_' : 'sr_p_';
      const val = localStorage.getItem(prefix + key);
      return val !== null ? { key, value: val, shared } : null;
    } catch { return null; }
  },
  set: async (key, value, shared = true) => {
    try {
      const prefix = shared ? 'sr_s_' : 'sr_p_';
      localStorage.setItem(prefix + key, typeof value === 'string' ? value : JSON.stringify(value));
      return { key, value, shared };
    } catch { return null; }
  },
  delete: async (key, shared = true) => {
    try {
      const prefix = shared ? 'sr_s_' : 'sr_p_';
      localStorage.removeItem(prefix + key);
      return { key, deleted: true, shared };
    } catch { return null; }
  },
  list: async (prefix = '', shared = true) => {
    try {
      const storePrefix = shared ? 'sr_s_' : 'sr_p_';
      const keys = Object.keys(localStorage)
        .filter(k => k.startsWith(storePrefix + prefix))
        .map(k => k.slice(storePrefix.length));
      return { keys, prefix, shared };
    } catch { return { keys: [] }; }
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
