import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Ship } from 'lucide-react';
import { platform } from '@/platform';
import type { MigrationInfo } from '@/platform';
import { Button } from '@/components/ui/Button';

interface MigrationScreenProps {
  onComplete: () => void;
}

type MigrationState = 'checking' | 'ready' | 'migrating' | 'success' | 'error' | 'not-needed';

export function MigrationScreen({ onComplete }: MigrationScreenProps) {
  const [state, setState] = useState<MigrationState>('checking');
  const [progress, setProgress] = useState(0);
  const [info, setInfo] = useState<MigrationInfo | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!platform.migration) {
      // Web platform — no migration needed
      onComplete();
      return;
    }

    platform.migration.checkMigration().then((result) => {
      setInfo(result);
      if (result.needed) {
        setState('ready');
      } else {
        setState('not-needed');
        onComplete();
      }
    });
  }, [onComplete]);

  const handleMigrate = async () => {
    if (!platform.migration) return;

    setState('migrating');
    setProgress(0);

    try {
      await platform.migration.runMigration((pct) => {
        setProgress(pct);
      });
      await platform.migration.markComplete();
      setState('success');
      // Auto-continue after a brief moment
      setTimeout(onComplete, 1500);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Migration failed');
    }
  };

  if (state === 'checking' || state === 'not-needed') {
    return (
      <div className="fixed inset-0 bg-cruise-bg flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <Loader2 className="w-8 h-8 text-ocean-400 animate-spin" />
          <p className="text-sm text-cruise-muted">Checking your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-cruise-bg flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6 text-center p-8 max-w-sm">
        {/* Icon */}
        <div className="w-20 h-20 bg-ocean-500/15 rounded-3xl flex items-center justify-center">
          {state === 'migrating' && <Loader2 className="w-10 h-10 text-ocean-400 animate-spin" />}
          {state === 'ready' && <Ship className="w-10 h-10 text-ocean-400" />}
          {state === 'success' && <CheckCircle2 className="w-10 h-10 text-emerald-400" />}
          {state === 'error' && <AlertTriangle className="w-10 h-10 text-red-400" />}
        </div>

        {/* Ready state */}
        {state === 'ready' && info && (
          <>
            <div>
              <h1 className="text-xl font-bold">Upgrading Your Data</h1>
              <p className="text-sm text-cruise-muted mt-2">
                CruiseFlow is moving your data to a faster, more reliable storage system
                that supports iCloud sync.
              </p>
            </div>
            <div className="bg-cruise-card rounded-xl border border-cruise-border p-4 w-full">
              <p className="text-sm text-cruise-muted">{info.description}</p>
            </div>
            <Button onClick={handleMigrate} className="w-full">
              Upgrade Now
            </Button>
            <p className="text-xs text-cruise-muted/70">
              This only takes a moment. Your data stays on this device.
            </p>
          </>
        )}

        {/* Migrating state */}
        {state === 'migrating' && (
          <>
            <div>
              <h1 className="text-xl font-bold">Upgrading...</h1>
              <p className="text-sm text-cruise-muted mt-2">
                Moving your cruise data to the new storage system.
                Please don&apos;t close the app.
              </p>
            </div>
            <div className="w-full">
              <div className="h-2 bg-cruise-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-ocean-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-cruise-muted mt-2">{progress}%</p>
            </div>
          </>
        )}

        {/* Success state */}
        {state === 'success' && (
          <div>
            <h1 className="text-xl font-bold text-emerald-400">Upgrade Complete!</h1>
            <p className="text-sm text-cruise-muted mt-2">
              Your data is now stored securely and ready for iCloud sync.
            </p>
          </div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <>
            <div>
              <h1 className="text-xl font-bold text-red-400">Upgrade Failed</h1>
              <p className="text-sm text-cruise-muted mt-2">
                Something went wrong. Your original data is still safe.
              </p>
              {error && (
                <p className="text-xs text-red-400/70 mt-2 font-mono">{error}</p>
              )}
            </div>
            <div className="flex gap-2 w-full">
              <Button variant="secondary" onClick={onComplete} className="flex-1">
                Skip
              </Button>
              <Button onClick={handleMigrate} className="flex-1">
                Retry
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
