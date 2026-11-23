export interface PwaUpdateHandle {
  applyUpdate: () => void;
}

interface TrustedTypesWindow {
  trustedTypes?: {
    createPolicy: (
      name: string,
      rules: { createScriptURL: (input: string) => string },
    ) => { createScriptURL: (input: string) => unknown };
  };
}

let swPolicy: { createScriptURL: (input: string) => unknown } | null = null;
let controllerChangeListenerBound = false;

/**
 * Eagerly initializes the narrow `jpd113-sw` Trusted Types policy at app boot
 * so only the exact same-origin `./sw.js` URL can ever be registered as a Service Worker.
 */
export function initTrustedSwPolicy(): void {
  if (typeof window === 'undefined' || swPolicy) return;
  const tt = (window as unknown as TrustedTypesWindow).trustedTypes;
  if (!tt) return;
  try {
    swPolicy = tt.createPolicy('jpd113-sw', {
      createScriptURL: (input: string) => {
        if (input !== './sw.js') {
          throw new Error('Blocked untrusted Service Worker URL');
        }
        return input;
      },
    });
  } catch {
    // Policy already exists or Trusted Types unavailable
  }
}

function createTrustedSwUrl(url: string): string | URL {
  if (url !== './sw.js') {
    throw new Error('Blocked untrusted Service Worker URL');
  }
  initTrustedSwPolicy();
  if (swPolicy) {
    return swPolicy.createScriptURL(url) as string;
  }
  return url;
}

/**
 * Registers the generated Workbox Service Worker using the narrow `jpd113-sw` Trusted Types policy.
 * Calls `onUpdateAvailable` when a new service worker is installed and waiting to activate.
 */
export function registerPwaServiceWorker(
  onUpdateAvailable: (handle: PwaUpdateHandle) => void,
): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  initTrustedSwPolicy();

  let awaitingActivation = false;
  let reloading = false;
  if (!controllerChangeListenerBound) {
    controllerChangeListenerBound = true;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!awaitingActivation || reloading) return;
      reloading = true;
      window.location.reload();
    });
  }

  const doRegister = () => {
    const swUrl = createTrustedSwUrl('./sw.js');
    navigator.serviceWorker
      .register(swUrl as string, { scope: './' })
      .then((reg) => {
        const notifyWaiting = (worker: ServiceWorker) => {
          onUpdateAvailable({
            applyUpdate: () => {
              awaitingActivation = true;
              worker.postMessage({ type: 'SKIP_WAITING' });
            },
          });
        };

        if (reg.waiting) {
          notifyWaiting(reg.waiting);
        }

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              notifyWaiting(installing);
            }
          });
        });
      })
      .catch(() => {
        // Fail gracefully if SW registration is blocked by browser privacy mode
      });
  };

  if (document.readyState === 'complete') {
    doRegister();
  } else {
    window.addEventListener('load', doRegister, { once: true });
  }
}
