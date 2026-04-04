import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import { CareProvider } from './context/CareContext';
import './index.css';

document.title = 'Health Care Companion';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CareProvider>
      <App />
    </CareProvider>
  </StrictMode>,
);
