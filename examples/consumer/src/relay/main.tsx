import { createRoot } from 'react-dom/client';
import '@stackunseen/ui/styles.css';
import { RelayApp } from './app';

createRoot(document.getElementById('root')!).render(<RelayApp />);
