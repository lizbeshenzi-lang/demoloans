// Web Audio API notification sounds - no external files needed
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  if (!audioCtx) return;
  // Resume context if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + duration);
}

/** Gentle two-tone chime for standard notifications */
export function playNotificationSound() {
  playTone(880, 0.15, 'sine', 0.2);
  setTimeout(() => playTone(1100, 0.2, 'sine', 0.15), 120);
}

/** Urgent three-tone alert for high-priority (success/payment) notifications */
export function playHighPrioritySound() {
  playTone(1047, 0.12, 'triangle', 0.3);
  setTimeout(() => playTone(1319, 0.12, 'triangle', 0.3), 100);
  setTimeout(() => playTone(1568, 0.25, 'triangle', 0.25), 200);
}

/** Request browser notification permission */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** Show a browser push notification */
export function showBrowserNotification(title: string, body: string, options?: { tag?: string; icon?: string }) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  try {
    const notif = new Notification(title, {
      body,
      icon: options?.icon || '/pwa-192x192.png',
      tag: options?.tag || 'kechita-notif',
      badge: '/pwa-192x192.png',
      requireInteraction: false,
    });
    // Auto-close after 6 seconds
    setTimeout(() => notif.close(), 6000);
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch {
    // SW notifications not available in this context
  }
}
