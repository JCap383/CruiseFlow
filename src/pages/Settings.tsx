import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ship, Plus, X, Trash2, Key, Eye, EyeOff, Share2, Download, Upload, Loader2, CheckCircle2, AlertTriangle, Database, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useCruise } from '@/hooks/useCruise';
import { useFamily, addMember, deleteMember } from '@/hooks/useFamily';
import { useAppStore } from '@/stores/appStore';
import { updateCruise, deleteCruise } from '@/hooks/useCruise';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MemberAvatar } from '@/components/family/MemberAvatar';
import { MEMBER_COLORS, MEMBER_EMOJIS } from '@/types';
import { useAllCruiseEvents } from '@/hooks/useEvents';
import { useSyncStatus, useLastSyncTime } from '@/hooks/useSyncStatus';
import { platform } from '@/platform';
import {
  downloadBackup,
  readBackupFile,
  validateBackup,
  restoreBackup,
  type BackupData,
} from '@/utils/backup';

export function Settings() {
  const navigate = useNavigate();
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);
  const setActiveCruise = useAppStore((s) => s.setActiveCruise);
  const apiKey = useAppStore((s) => s.apiKey);
  const setApiKey = useAppStore((s) => s.setApiKey);
  const cruise = useCruise(activeCruiseId);
  const members = useFamily();
  const events = useAllCruiseEvents();
  const syncStatus = useSyncStatus();
  const lastSyncTime = useLastSyncTime();

  const [newMemberName, setNewMemberName] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [editingCruise, setEditingCruise] = useState(false);
  const [cruiseName, setCruiseName] = useState('');
  const [shipName, setShipName] = useState('');

  // Backup & restore state
  const restoreFileRef = useRef<HTMLInputElement>(null);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [backupMessage, setBackupMessage] = useState('');
  const [restorePreview, setRestorePreview] = useState<BackupData | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'confirming' | 'success' | 'error'>('idle');
  const [restoreMessage, setRestoreMessage] = useState('');

  const handleAddMember = async () => {
    if (!newMemberName.trim() || !activeCruiseId) return;
    await addMember({
      cruiseId: activeCruiseId,
      name: newMemberName.trim(),
      emoji: MEMBER_EMOJIS[members.length % MEMBER_EMOJIS.length]!,
      color: MEMBER_COLORS[members.length % MEMBER_COLORS.length]!,
      isChild: false,
    });
    setNewMemberName('');
  };

  const handleDeleteMember = async (id: string) => {
    await deleteMember(id);
  };

  const handleEditCruise = () => {
    if (cruise) {
      setCruiseName(cruise.name);
      setShipName(cruise.shipName);
      setEditingCruise(true);
    }
  };

  const handleSaveCruise = async () => {
    if (activeCruiseId) {
      await updateCruise(activeCruiseId, {
        name: cruiseName,
        shipName: shipName,
      });
      setEditingCruise(false);
    }
  };

  const handleDeleteCruise = async () => {
    if (activeCruiseId) {
      await deleteCruise(activeCruiseId);
      setActiveCruise(null);
      navigate('/onboarding');
    }
  };

  const handleNewCruise = () => {
    setActiveCruise(null);
    navigate('/onboarding');
  };

  const handleShare = async () => {
    const shareData = {
      title: 'CruiseFlow - Cruise Command Center',
      text: 'Check out CruiseFlow! Plan your cruise, track your family\'s schedule, and build a cruise journal.',
      url: window.location.origin,
    };

    let message = '';
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        message = 'Shared successfully!';
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        message = 'Link copied to clipboard!';
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(window.location.origin);
        message = 'Link copied to clipboard!';
      } catch {
        message = 'Could not share. Copy this link: ' + window.location.origin;
      }
    }

    setShareMessage(message);
    setTimeout(() => setShareMessage(''), 3000);
  };

  const handleBackup = async () => {
    setBackupStatus('loading');
    setBackupMessage('');
    try {
      await downloadBackup();
      setBackupStatus('success');
      setBackupMessage('Backup downloaded!');
      setTimeout(() => {
        setBackupStatus('idle');
        setBackupMessage('');
      }, 3000);
    } catch (err) {
      setBackupStatus('error');
      setBackupMessage(err instanceof Error ? err.message : 'Backup failed.');
      setTimeout(() => {
        setBackupStatus('idle');
        setBackupMessage('');
      }, 5000);
    }
  };

  const handleRestoreFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset file input so the same file can be re-selected
    e.target.value = '';

    setRestoreStatus('loading');
    setRestoreMessage('');
    setRestorePreview(null);

    try {
      const raw = await readBackupFile(file);
      const result = validateBackup(raw);

      if (!result.valid) {
        setRestoreStatus('error');
        setRestoreMessage(result.error);
        setTimeout(() => {
          setRestoreStatus('idle');
          setRestoreMessage('');
        }, 5000);
        return;
      }

      setRestorePreview(result.backup);
      setRestoreStatus('confirming');
    } catch (err) {
      setRestoreStatus('error');
      setRestoreMessage(err instanceof Error ? err.message : 'Could not read file.');
      setTimeout(() => {
        setRestoreStatus('idle');
        setRestoreMessage('');
      }, 5000);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restorePreview) return;
    setRestoreStatus('loading');

    try {
      const counts = await restoreBackup(restorePreview);
      // Set active cruise to the first restored cruise
      if (restorePreview.cruises.length > 0) {
        setActiveCruise(restorePreview.cruises[0]!.id);
      }
      setRestoreStatus('success');
      setRestoreMessage(
        `Restored ${counts.cruises} cruise${counts.cruises !== 1 ? 's' : ''}, ` +
        `${counts.members} member${counts.members !== 1 ? 's' : ''}, ` +
        `${counts.events} event${counts.events !== 1 ? 's' : ''}.`
      );
      setRestorePreview(null);
      setTimeout(() => {
        setRestoreStatus('idle');
        setRestoreMessage('');
      }, 5000);
    } catch (err) {
      setRestoreStatus('error');
      setRestoreMessage(err instanceof Error ? err.message : 'Restore failed.');
      setTimeout(() => {
        setRestoreStatus('idle');
        setRestoreMessage('');
      }, 5000);
    }
  };

  const handleRestoreCancel = () => {
    setRestorePreview(null);
    setRestoreStatus('idle');
    setRestoreMessage('');
  };

  if (!cruise) {
    return (
      <div className="p-6 text-center">
        <p className="text-cruise-muted">No active cruise</p>
        <Button onClick={handleNewCruise} className="mt-4">
          Set Up Cruise
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-2 pb-2 border-b border-cruise-border">
        <h1 className="text-lg font-bold">Settings</h1>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {/* Cruise info */}
        <section>
          <h2 className="text-sm font-medium text-cruise-muted mb-3 uppercase tracking-wider">
            Cruise
          </h2>
          {editingCruise ? (
            <div className="flex flex-col gap-3 bg-cruise-card rounded-2xl p-4 border border-cruise-border">
              <Input
                id="editCruiseName"
                label="Cruise name"
                value={cruiseName}
                onChange={(e) => setCruiseName(e.target.value)}
              />
              <Input
                id="editShipName"
                label="Ship name"
                value={shipName}
                onChange={(e) => setShipName(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setEditingCruise(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveCruise} className="flex-1">
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleEditCruise}
              className="w-full bg-cruise-card rounded-2xl p-4 border border-cruise-border text-left active:bg-cruise-border transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-ocean-500/20 rounded-xl flex items-center justify-center">
                  <Ship className="w-5 h-5 text-ocean-400" />
                </div>
                <div>
                  <p className="font-semibold">{cruise.name}</p>
                  <p className="text-sm text-cruise-muted">{cruise.shipName}</p>
                  <p className="text-xs text-cruise-muted mt-0.5">
                    {cruise.startDate} to {cruise.endDate}
                  </p>
                </div>
              </div>
            </button>
          )}
        </section>

        {/* Family members */}
        <section>
          <h2 className="text-sm font-medium text-cruise-muted mb-3 uppercase tracking-wider">
            Family Members
          </h2>
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 bg-cruise-card rounded-xl px-4 py-3 border border-cruise-border"
              >
                <MemberAvatar member={m} size="sm" />
                <span className="flex-1 font-medium">{m.name}</span>
                {m.isChild && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400">
                    Child
                  </span>
                )}
                <button
                  onClick={() => handleDeleteMember(m.id)}
                  className="text-cruise-muted p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2 mt-1">
              <Input
                id="newMember"
                placeholder="Add member..."
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
                className="flex-1"
              />
              <Button
                onClick={handleAddMember}
                variant="secondary"
                className="shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* API Key */}
        <section>
          <h2 className="text-sm font-medium text-cruise-muted mb-3 uppercase tracking-wider">
            AI Features
          </h2>
          <div className="bg-cruise-card rounded-2xl p-4 border border-cruise-border flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-cruise-muted">
              <Key className="w-4 h-4" />
              <span>Google Gemini API Key</span>
            </div>
            <p className="text-xs text-cruise-muted/70">
              Free from aistudio.google.com/apikey — required for the cruise
              concierge. Stored locally on this device only.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full rounded-xl bg-cruise-surface border border-cruise-border px-4 py-2.5 text-sm text-cruise-text placeholder:text-cruise-muted/50 focus:outline-none focus:border-ocean-500 transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cruise-muted"
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            {apiKey && (
              <p className="text-xs text-emerald-400">Key saved</p>
            )}
          </div>
        </section>

        {/* Share */}
        <section>
          <h2 className="text-sm font-medium text-cruise-muted mb-3 uppercase tracking-wider">
            Share CruiseFlow
          </h2>
          <div className="bg-cruise-card rounded-2xl p-4 border border-cruise-border flex flex-col gap-3">
            <p className="text-xs text-cruise-muted/70">
              Share CruiseFlow with friends and family so they can install it on
              their own device and log their own cruises.
            </p>
            <Button variant="secondary" onClick={handleShare}>
              <span className="flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" />
                Share App Link
              </span>
            </Button>
            {shareMessage && (
              <p className="text-xs text-emerald-400 text-center">{shareMessage}</p>
            )}
          </div>
        </section>

        {/* Data & Sync */}
        <section>
          <h2 className="text-sm font-medium text-cruise-muted mb-3 uppercase tracking-wider">
            Data & Sync
          </h2>
          <div className="bg-cruise-card rounded-2xl p-4 border border-cruise-border flex flex-col gap-3">
            {/* Storage info */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-ocean-500/15 rounded-lg flex items-center justify-center">
                <Database className="w-4 h-4 text-ocean-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Local Storage</p>
                <p className="text-xs text-cruise-muted">
                  {platform.name === 'web' ? 'IndexedDB (Browser)' : 'SQLite (Device)'}
                </p>
              </div>
            </div>

            {/* Data counts */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-cruise-surface rounded-xl p-2">
                <p className="text-lg font-bold text-ocean-400">1</p>
                <p className="text-[10px] text-cruise-muted uppercase">Cruise</p>
              </div>
              <div className="bg-cruise-surface rounded-xl p-2">
                <p className="text-lg font-bold text-ocean-400">{members.length}</p>
                <p className="text-[10px] text-cruise-muted uppercase">Members</p>
              </div>
              <div className="bg-cruise-surface rounded-xl p-2">
                <p className="text-lg font-bold text-ocean-400">{events.length}</p>
                <p className="text-[10px] text-cruise-muted uppercase">Events</p>
              </div>
            </div>

            {/* Sync status */}
            <div className="flex items-center gap-3 pt-1 border-t border-cruise-border">
              <div className="w-8 h-8 bg-cruise-surface rounded-lg flex items-center justify-center">
                {syncStatus === 'synced' && <Cloud className="w-4 h-4 text-emerald-400" />}
                {syncStatus === 'syncing' && <RefreshCw className="w-4 h-4 text-ocean-400 animate-spin" />}
                {syncStatus === 'offline' && <CloudOff className="w-4 h-4 text-amber-400" />}
                {syncStatus === 'unavailable' && <CloudOff className="w-4 h-4 text-cruise-muted" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {syncStatus === 'synced' && 'iCloud Synced'}
                  {syncStatus === 'syncing' && 'Syncing...'}
                  {syncStatus === 'offline' && 'Offline'}
                  {syncStatus === 'unavailable' && 'iCloud Sync'}
                </p>
                <p className="text-xs text-cruise-muted">
                  {syncStatus === 'unavailable'
                    ? 'Available in the native iOS app'
                    : syncStatus === 'synced'
                      ? lastSyncTime
                        ? `Last synced ${new Date(lastSyncTime).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}`
                        : 'All data backed up to iCloud'
                      : syncStatus === 'offline'
                        ? 'Changes will sync when online'
                        : 'Uploading changes...'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Backup & Restore */}
        <section>
          <h2 className="text-sm font-medium text-cruise-muted mb-3 uppercase tracking-wider">
            Backup & Restore
          </h2>
          <div className="bg-cruise-card rounded-2xl p-4 border border-cruise-border flex flex-col gap-3">
            <p className="text-xs text-cruise-muted/70">
              Export all your cruises, events, photos, and family members as a
              backup file. Restore from a backup to recover your data on any
              device.
            </p>

            {/* Backup button */}
            <Button
              variant="secondary"
              onClick={handleBackup}
              disabled={backupStatus === 'loading'}
            >
              <span className="flex items-center justify-center gap-2">
                {backupStatus === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download Backup
              </span>
            </Button>

            {backupMessage && (
              <p className={`text-xs text-center ${backupStatus === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                {backupMessage}
              </p>
            )}

            {/* Restore button */}
            <input
              ref={restoreFileRef}
              type="file"
              accept=".json"
              onChange={handleRestoreFileSelect}
              className="hidden"
            />
            <Button
              variant="secondary"
              onClick={() => restoreFileRef.current?.click()}
              disabled={restoreStatus === 'loading' || restoreStatus === 'confirming'}
            >
              <span className="flex items-center justify-center gap-2">
                {restoreStatus === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Restore from Backup
              </span>
            </Button>

            {/* Restore confirmation */}
            {restoreStatus === 'confirming' && restorePreview && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-300">
                    <p className="font-medium">Replace all current data?</p>
                    <p className="text-xs text-amber-300/70 mt-1">
                      This backup contains{' '}
                      <strong>{restorePreview.cruises.length}</strong> cruise{restorePreview.cruises.length !== 1 ? 's' : ''},{' '}
                      <strong>{restorePreview.members.length}</strong> member{restorePreview.members.length !== 1 ? 's' : ''},{' '}
                      and <strong>{restorePreview.events.length}</strong> event{restorePreview.events.length !== 1 ? 's' : ''}.
                    </p>
                    {restorePreview.exportedAt && (
                      <p className="text-xs text-amber-300/70 mt-0.5">
                        Created: {new Date(restorePreview.exportedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleRestoreCancel}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleRestoreConfirm}
                    className="flex-1"
                  >
                    Replace & Restore
                  </Button>
                </div>
              </div>
            )}

            {/* Restore result message */}
            {restoreMessage && restoreStatus !== 'confirming' && (
              <p className={`text-xs text-center flex items-center justify-center gap-1 ${
                restoreStatus === 'success' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {restoreStatus === 'success' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {restoreMessage}
              </p>
            )}
          </div>
        </section>

        {/* Danger zone */}
        <section>
          <h2 className="text-sm font-medium text-cruise-muted mb-3 uppercase tracking-wider">
            Danger Zone
          </h2>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={handleNewCruise}>
              Start New Cruise
            </Button>
            <Button variant="danger" onClick={handleDeleteCruise}>
              <span className="flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" />
                Delete This Cruise
              </span>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
