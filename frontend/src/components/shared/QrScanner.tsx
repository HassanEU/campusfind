import * as React from 'react';
import { Camera, CameraOff, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { parseCampusFindCode } from '@/lib/utils';

/**
 * Camera-based QR scanning.
 *
 * html5-qrcode is loaded lazily, only when the user actually asks for the
 * camera, so the library is never downloaded by someone who types the code by
 * hand. If permission is denied or no camera exists, this component reports the
 * failure and the manual entry field beside it remains fully functional — the
 * fallback is never a dead end.
 */
export function QrScanner({
  onScan,
  onError,
}: {
  onScan: (code: string) => void;
  onError?: (message: string) => void;
}) {
  const containerId = React.useId().replace(/:/g, '');
  const [state, setState] = React.useState<'idle' | 'starting' | 'scanning' | 'error'>('idle');
  const [message, setMessage] = React.useState<string | null>(null);
  const scannerRef = React.useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  const stop = React.useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
      scanner.clear();
    } catch {
      // Stopping a scanner that is already stopped is harmless.
    }
  }, []);

  // Releasing the camera on unmount matters: without it the indicator light
  // stays on after the user navigates away.
  React.useEffect(() => () => void stop(), [stop]);

  async function start() {
    setState('starting');
    setMessage(null);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(containerId, { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          const code = parseCampusFindCode(decoded);
          if (code) {
            void stop().then(() => setState('idle'));
            onScan(code);
          } else {
            setMessage(`Scanned "${decoded}", which is not a CampusFind label.`);
          }
        },
        () => {
          // Fired continuously for every frame without a code. Ignored.
        },
      );

      setState('scanning');
    } catch (error) {
      const text =
        error instanceof Error && /permission|NotAllowed/i.test(error.message)
          ? 'Camera permission was denied. Enter the code below instead.'
          : 'No camera is available on this device. Enter the code below instead.';

      setState('error');
      setMessage(text);
      onError?.(text);
    }
  }

  return (
    <div>
      <div
        className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-muted"
        aria-live="polite"
      >
        <div id={containerId} className="size-full [&_video]:size-full [&_video]:object-cover" />

        {state !== 'scanning' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            {state === 'starting' ? (
              <>
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Starting the camera…</p>
              </>
            ) : state === 'error' ? (
              <>
                <CameraOff className="size-6 text-muted-foreground" />
                <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
                <Button variant="secondary" size="sm" onClick={start}>
                  Try the camera again
                </Button>
              </>
            ) : (
              <>
                <Camera className="size-6 text-muted-foreground" />
                <p className="max-w-xs text-sm text-muted-foreground">
                  Point the camera at the QR label attached to the item.
                </p>
                <Button variant="primary" size="sm" onClick={start}>
                  <Camera />
                  Start camera
                </Button>
              </>
            )}
          </div>
        ) : null}

        {/* Framing guide, drawn only while the camera is live. */}
        {state === 'scanning' ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="size-56 rounded-lg border-2 border-primary/70 shadow-[0_0_0_9999px_hsl(var(--foreground)/0.35)]" />
          </div>
        ) : null}
      </div>

      {state === 'scanning' ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{message ?? 'Looking for a label…'}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void stop().then(() => setState('idle'))}
          >
            Stop
          </Button>
        </div>
      ) : null}
    </div>
  );
}
