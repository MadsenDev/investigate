import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Vitni2App } from './v2/Vitni2App';
import './index.css';

const queryUi = new URLSearchParams(window.location.search).get('ui');
if (queryUi === 'v2' || queryUi === 'legacy') {
  window.localStorage.setItem('vitni.ui', queryUi);
}
const persistedUi = window.localStorage.getItem('vitni.ui');
const useVitni2 = queryUi === 'v2' || (queryUi !== 'legacy' && persistedUi === 'v2');

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {useVitni2 ? <Vitni2App /> : <App />}
  </React.StrictMode>
);
