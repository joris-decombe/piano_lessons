import { useEffect } from 'react';

/**
 * Holds a screen Wake Lock while `active` is true, so the device does not dim
 * or sleep mid-practice (iOS/iPadOS 16.4+, Chrome).
 *
 * iOS makes this harder than it looks:
 *  - The lock is dropped whenever the page is hidden — locking the screen once
 *    is enough to lose it for good unless it is re-acquired on return.
 *  - Safari also drops it on its own (entering fullscreen, a transient
 *    backgrounding). The sentinel fires `release` when that happens, which is
 *    the only reliable signal that the lock is gone.
 *  - A request outside a user gesture can be refused outright, so a re-acquire
 *    on `visibilitychange` alone is not dependable. Retrying on the next touch
 *    costs nothing and is usually what gets the lock back.
 */

interface WakeLockSentinel extends EventTarget {
    released: boolean;
    release(): Promise<void>;
}

export function useWakeLock(active: boolean) {
    useEffect(() => {
        if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
            return;
        }

        let cancelled = false;
        let sentinel: WakeLockSentinel | null = null;
        // visibilitychange and pointerdown can land together; without this both
        // would see a null sentinel and take out a lock, leaking one of them.
        let acquiring = false;

        const handleRelease = () => {
            sentinel = null;
        };

        const acquire = async () => {
            // Already held or in flight, or the page is hidden and the request
            // would be refused anyway.
            if (cancelled || sentinel || acquiring) return;
            if (document.visibilityState !== 'visible') return;
            acquiring = true;
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const lock: WakeLockSentinel = await (navigator as any).wakeLock.request('screen');
                if (cancelled) {
                    lock.release().catch(() => {});
                    return;
                }
                sentinel = lock;
                lock.addEventListener('release', handleRelease);
            } catch {
                // Refused (no user gesture, low power mode, unsupported). The
                // listeners below will try again at the next opportunity.
            } finally {
                acquiring = false;
            }
        };

        void acquire();

        // Returning to the app, and any touch, are both chances to get it back.
        document.addEventListener('visibilitychange', acquire);
        window.addEventListener('pageshow', acquire);
        window.addEventListener('pointerdown', acquire);

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', acquire);
            window.removeEventListener('pageshow', acquire);
            window.removeEventListener('pointerdown', acquire);
            if (sentinel) {
                sentinel.removeEventListener('release', handleRelease);
                sentinel.release().catch(() => {});
                sentinel = null;
            }
        };
    }, [active]);
}
