import { render } from 'preact';
import { App } from './ui/App';
import './ui/styles.css';

render(<App />, document.getElementById('app')!);

// Offline-Unterstützung für die Web-Version (nicht in der Android-App nötig)
const isNative = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
