import { render } from 'preact';
import { App } from './ui/App';
import './ui/styles.css';

if (location.search.includes('map')) {
  import('./devGallery').then((m) => m.mountMap(document.getElementById('app')!));
} else if (location.search.includes('rooms')) {
  import('./devGallery').then((m) => m.mountRooms(document.getElementById('app')!));
} else if (location.search.includes('gallery')) {
  import('./devGallery').then((m) => m.mountGallery(document.getElementById('app')!));
} else {
  render(<App />, document.getElementById('app')!);
}

// Offline-Unterstützung für die Web-Version (nicht in der Android-App nötig)
const isNative = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
