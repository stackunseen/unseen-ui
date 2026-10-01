import { createRoot } from 'react-dom/client';
import '@ai-interaction/react/styles.css';
import { RelayApp } from './app';

createRoot(document.getElementById('root')!).render(<RelayApp />);
