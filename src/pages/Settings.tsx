import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parse, isValid } from 'date-fns';
import {
  Ship,
  Plus,
  X,
  Trash2,
  Key,
  Eye,
  EyeOff,
  Share2,
  Download,
  Upload,
  Loader2,
  AlertTriangle,
  Database,
  Cloud,
  CloudOff,
  RefreshCw,
  Users,
  Sun,
  Moon,
  SmartphoneNfc,
  Sparkles,
  Check,
  Anchor,
  ArrowRightLeft,
  Pencil,
  Eye as EyeIcon,
} from 'lucide-react';
import { useCruise, useCruises, updateCruise, deleteCruise } from '@/hooks/useCruise';
import { ShipPicker } from '@/components/ships/ShipPicker';
import { getCruiseLineForShip } from '@/db/shipCatalog';
import { seedDemoCruise } from '@/data/seedDemoCruise';
import {
  useFamily,
  addMember,
  updateMember,
  deleteMember,
} from '@/hooks/useFamily';
import { useAppStore } from '@/stores/appStore';
import type { FamilyMember } from '@/types';
import type { ThemePreference } from '@/stores/appStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MemberAvatar } from '@/components/family/MemberAvatar';
import { MEMBER_COLORS, MEMBER_EMOJIS } from '@/types';
import { useAllCruiseEvents } from '@/hooks/useEvents';
import { useSyncStatus, useLastSyncTime } from '@/hooks/useSyncStatus';
import { platform } from '@/platform';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Text } from '@/components/ui/Text';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { haptics } from '@/utils/haptics';
import {
  downloadBackup,
  readBackupFile,
  validateBackup,
  restoreBackup,
  type BackupData,
} from '@/utils/backup';
import { isValidIsoDate } from '@/stores/appStore';

// #82: format ISO dates as friendly labels (e.g. "Jul 10, 2026"). Falls
// back to the raw string if the value isn't a parseable yyyy-MM-dd, so we
// never crash on partially-typed input from the date picker.
function formatTripDate(iso: string | undefined | null): string {
  if (!iso) return '';
  if (!isValidIsoDate(iso)) return iso;
  const d = parse(iso, 'yyyy-MM-dd', new Date());
  return isValid(d) ? format(d, 'MMM d, yyyy') : iso;
}

// #73 / #92: clamp a yyyy-MM-dd date into a cruise's window so we never
// strand the user on a day that doesn't belong to the active trip.
function clampDateToCruise(
  date: string,
  startDate: string,
  endDate: string,
): string {
  if (!isValidIsoDate(date)) return startDate;
  if (date < startDate) return startDate;
  if (date > endDate) return endDate;
  return date;
}

export function Settings() {
  const navigate = useNavigate();
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);
  const setActiveCruise = useAppStore((s) => s.setActiveCruise);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const apiKey = useAppStore((s) => s.apiKey);
  const setApiKey = useAppStore((s) => s.setApiKey);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const cruise = useCruise(activeCruiseId);
  const cruises = useCruises() ?? [];
  const members = useFamily();
  const events = useAllCruiseEvents();
  const syncStatus = useSyncStatus();
  const lastSyncTime = useLastSyncTime();
  const toast = useToast();

  // Sheet state
  const [showCruiseSheet, setShowCruiseSheet] = useState(false);
  const [showCruiseSwitcher, setShowCruiseSwitcher] = useState(false);
  const [showFamilySheet, setShowFamilySheet] = useState(false);
  const [showApiSheet, setShowApiSheet] = useState(false);
  const [showThemeSheet, setShowThemeSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit cruise state
  const [cruiseName, setCruiseName] = useState('');
  const [shipName, setShipName] = useState('');
  // #72: trip start/end are now editable from Settings (the previous flow
  // forced you to delete and re-create the cruise just to fix a typo).
  const [cruiseStartDate, setCruiseStartDate] = useState('');
  const [cruiseEndDate, setCruiseEndDate] = useState('');

  // Family state
  const [newMemberName, setNewMemberName] = useState('');
  // #84: emoji + child toggle for new members so the add flow no longer
  // silently picks defaults the user can't see.
  const [newMemberEmoji, setNewMemberEmoji] = useState<string>(
    MEMBER_EMOJIS[0]!,
  );
  const [newMemberIsChild, setNewMemberIsChild] = useState(false);
  // #83: edit-in-place for an existing family member.
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberEmoji, setEditMemberEmoji] = useState<string>(
    MEMBER_EMOJIS[0]!,
  );
  const [editMemberIsChild, setEditMemberIsChild] = useState(false);

  // API key
  const [showApiKey, setShowApiKey] = useState(false);

  // Sync
  const [isSyncing, setIsSyncing] = useState(false);

  // Backup & restore
  const restoreFileRef = useRef<HTMLInputElement>(null);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading'>('idle');
  const [restoreStatus, setRestoreStatus] = useState<
    'idle' | 'loading' | 'confirming'
  >('idle');
  const [restorePreview, setRestorePreview] = useState<BackupData | null>(null);

  const openCruiseEditor = () => {
    if (cruise) {
      setCruiseName(cruise.name);
      setShipName(cruise.shipName);
      setCruiseStartDate(cruise.startDate);
      setCruiseEndDate(cruise.endDate);
      setShowCruiseSheet(true);
    }
  };

  const handleSaveCruise = async () => {
    if (!activeCruiseId) return;
    // #72: validate the new window before persisting. If the user typed an
    // end date that comes before the start, swap them rather than refusing
    // — the most likely intent.
    let nextStart = cruiseStartDate;
    let nextEnd = cruiseEndDate;
    if (
      isValidIsoDate(nextStart) &&
      isValidIsoDate(nextEnd) &&
      nextEnd < nextStart
    ) {
      [nextStart, nextEnd] = [nextEnd, nextStart];
    }
    if (!isValidIsoDate(nextStart) || !isValidIsoDate(nextEnd)) {
      toast.error('Please pick valid start and end dates');
      return;
    }
    await updateCruise(activeCruiseId, {
      name: cruiseName,
      shipName,
      startDate: nextStart,
      endDate: nextEnd,
    });
    // #73: pull the currently-selected day back into the new window so the
    // schedule view doesn't end up showing an empty out-of-range day.
    const currentSelected = useAppStore.getState().selectedDate;
    const clamped = clampDateToCruise(currentSelected, nextStart, nextEnd);
    if (clamped !== currentSelected) {
      setSelectedDate(clamped);
    }
    setShowCruiseSheet(false);
    toast.success('Trip details saved');
    void haptics.success();
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim() || !activeCruiseId) return;
    await addMember({
      cruiseId: activeCruiseId,
      name: newMemberName.trim(),
      emoji: newMemberEmoji,
      // Cycle colors so each new member still picks up a distinct accent.
      color: MEMBER_COLORS[members.length % MEMBER_COLORS.length]!,
      isChild: newMemberIsChild,
    });
    setNewMemberName('');
    setNewMemberIsChild(false);
    setNewMemberEmoji(
      MEMBER_EMOJIS[(members.length + 1) % MEMBER_EMOJIS.length]!,
    );
    void haptics.tap();
  };

  // #83: open the inline editor for a member.
  const openEditMember = (m: FamilyMember) => {
    setEditingMember(m);
    setEditMemberName(m.name);
    setEditMemberEmoji(m.emoji);
    setEditMemberIsChild(m.isChild);
  };

  const handleSaveMember = async () => {
    if (!editingMember) return;
    if (!editMemberName.trim()) {
      toast.error('Name is required');
      return;
    }
    await updateMember(editingMember.id, {
      name: editMemberName.trim(),
      emoji: editMemberEmoji,
      isChild: editMemberIsChild,
    });
    setEditingMember(null);
    void haptics.success();
  };

  const handleDeleteMember = async (id: string) => {
    await deleteMember(id);
    if (editingMember?.id === id) setEditingMember(null);
    void haptics.warning();
  };

  const handleDeleteCruise = async () => {
    if (!activeCruiseId) return;
    const deletedId = activeCruiseId;
    await deleteCruise(deletedId);
    setShowDeleteConfirm(false);

    // If other cruises still exist, fall back to the most recent one so the
    // user stays inside the app. Otherwise route them through onboarding.
    const remaining = cruises.filter((c) => c.id !== deletedId);
    if (remaining.length > 0) {
      const next = [...remaining].sort((a, b) => b.createdAt - a.createdAt)[0]!;
      setActiveCruise(next.id);
      // #73: snap the selected date into the next cruise's window so the
      // schedule doesn't open on a deleted-trip date.
      setSelectedDate(
        clampDateToCruise(
          useAppStore.getState().selectedDate,
          next.startDate,
          next.endDate,
        ),
      );
      toast.success(`Switched to ${next.name}`);
      navigate('/');
    } else {
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
      title: 'CruiseFlow',
      text: 'Check out CruiseFlow — plan your cruise & build a journal.',
      url: window.location.origin,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Shared');
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        toast.success('Link copied');
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(window.location.origin);
        toast.success('Link copied');
      } catch {
        toast.error('Could not share');
      }
    }
  };

  const handleSyncNow = async () => {
    if (!platform.sync || isSyncing) return;
    setIsSyncing(true);
    try {
      await platform.sync.sync();
      toast.success('Synced with iCloud');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBackup = async () => {
    setBackupStatus('loading');
    try {
      await downloadBackup();
      toast.success('Backup downloaded');
      void haptics.success();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setBackupStatus('idle');
    }
  };

  const handleRestoreFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setRestoreStatus('loading');
    setRestorePreview(null);
    try {
      const raw = await readBackupFile(file);
      const result = validateBackup(raw);
      if (!result.valid) {
        toast.error(result.error);
        setRestoreStatus('idle');
        return;
      }
      setRestorePreview(result.backup);
      setRestoreStatus('confirming');
      void haptics.warning();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read file');
      setRestoreStatus('idle');
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restorePreview) return;
    setRestoreStatus('loading');
    try {
      const counts = await restoreBackup(restorePreview);
      if (restorePreview.cruises.length > 0) {
        const firstCruise = restorePreview.cruises[0]!;
        setActiveCruise(firstCruise.id);
        // #92: the persisted selectedDate almost certainly belongs to a
        // different (now-replaced) cruise. Snap it into the restored
        // cruise's window so the schedule view opens on a real day.
        const today = format(new Date(), 'yyyy-MM-dd');
        const seed =
          today >= firstCruise.startDate && today <= firstCruise.endDate
            ? today
            : firstCruise.startDate;
        setSelectedDate(seed);
      }
      toast.success(
        `Restored ${counts.cruises} cruise, ${counts.members} members, ${counts.events} events`,
      );
      setRestorePreview(null);
      void haptics.success();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setRestoreStatus('idle');
    }
  };

  // ── Empty state ────────────────────────────────────────────
  if (!cruise) {
    return (
      <div className="p-6 text-center flex flex-col items-center gap-4">
        <Text variant="callout" tone="muted">
          No active cruise
        </Text>
        <Button onClick={handleNewCruise} size="lg">
          Set up a cruise
        </Button>
      </div>
    );
  }

  // ── Derived values ─────────────────────────────────────────
  const themeLabel: Record<ThemePreference, string> = {
    system: 'System',
    dark: 'Dark',
    light: 'Light',
  };
  const themeIcon: Record<ThemePreference, typeof Sun> = {
    system: SmartphoneNfc,
    dark: Moon,
    light: Sun,
  };
  const ThemeIcon = themeIcon[theme];

  const syncTitleMap: Record<typeof syncStatus, string> = {
    synced: 'iCloud synced',
    syncing: 'Syncing...',
    offline: 'Offline',
    unavailable: 'iCloud sync',
  };
  const syncSubtitle =
    syncStatus === 'unavailable'
      ? 'Available in the native iOS app'
      : syncStatus === 'synced'
        ? lastSyncTime
          ? `Last synced ${new Date(lastSyncTime).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}`
          : 'All data backed up to iCloud'
        : syncStatus === 'offline'
          ? 'Changes will sync when online'
          : 'Uploading changes...';

  const memberCountLabel = `${members.length} ${members.length === 1 ? 'person' : 'people'}`;

  return (
    <div className="flex flex-col">
      {/* ── Header ────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 px-4 pt-2 pb-3 backdrop-blur-xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-default) 85%, transparent)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <Text variant="largeTitle" weight="bold">
          Settings
        </Text>
      </div>

      <div className="px-4 pt-4 pb-8 flex flex-col gap-6">
        {/* ── Trip ─────────────────────────────────────────── */}
        <ListGroup
          title="Trip"
          footer={
            cruises.length > 1
              ? `You have ${cruises.length} cruises saved. Tap "Switch cruise" to change the active one.`
              : 'Tap to edit this trip, or add a new cruise to plan another.'
          }
        >
          <ListRow
            icon={<Ship className="w-4 h-4" />}
            title={cruise.name}
            subtitle={`${cruise.shipName} · ${formatTripDate(cruise.startDate)} → ${formatTripDate(cruise.endDate)}`}
            onClick={openCruiseEditor}
            ariaLabel={`Edit trip ${cruise.name}`}
          />
          {/* #85: hide switch row when there's nothing to switch to. */}
          {cruises.length > 1 && (
            <ListRow
              icon={<ArrowRightLeft className="w-4 h-4" />}
              title="Switch cruise"
              subtitle={`${cruises.length} cruises available`}
              onClick={() => setShowCruiseSwitcher(true)}
            />
          )}
          <ListRow
            icon={<Plus className="w-4 h-4" />}
            title="New cruise"
            subtitle="Start planning another trip"
            onClick={handleNewCruise}
          />
          <ListRow
            icon={<EyeIcon className="w-4 h-4" />}
            title="Try demo cruise"
            subtitle="Explore a pre-filled sample trip"
            onClick={async () => {
              const id = await seedDemoCruise();
              setActiveCruise(id);
              void haptics.success();
              toast.success('Demo cruise loaded');
            }}
          />
        </ListGroup>

        {/* ── Family ───────────────────────────────────────── */}
        <ListGroup
          title="Family"
          footer="Add, remove, and rename the people on this trip."
        >
          <ListRow
            icon={<Users className="w-4 h-4" />}
            title="Family members"
            subtitle={memberCountLabel}
            onClick={() => setShowFamilySheet(true)}
          />
        </ListGroup>

        {/* ── Appearance ───────────────────────────────────── */}
        <ListGroup title="Appearance">
          <ListRow
            icon={<ThemeIcon className="w-4 h-4" />}
            title="Theme"
            subtitle={themeLabel[theme]}
            onClick={() => setShowThemeSheet(true)}
          />
        </ListGroup>

        {/* ── AI ───────────────────────────────────────────── */}
        <ListGroup
          title="AI Concierge"
          footer="Your Gemini key stays on this device. Get a free key at aistudio.google.com/apikey."
        >
          <ListRow
            icon={<Sparkles className="w-4 h-4" />}
            title="Gemini API key"
            subtitle={apiKey ? 'Key saved · tap to edit' : 'Not configured'}
            onClick={() => setShowApiSheet(true)}
          />
        </ListGroup>

        {/* ── Data & Sync ──────────────────────────────────── */}
        <ListGroup title="Data & Sync">
          <ListRow
            icon={<Database className="w-4 h-4" />}
            title="Local storage"
            subtitle={platform.name === 'web' ? 'IndexedDB (browser)' : 'SQLite (device)'}
            trailing={
              <Text variant="footnote" tone="muted">
                {events.length} events
              </Text>
            }
          />
          <ListRow
            icon={
              syncStatus === 'syncing' || isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : syncStatus === 'synced' ? (
                <Cloud className="w-4 h-4" />
              ) : (
                <CloudOff className="w-4 h-4" />
              )
            }
            iconBackground={
              syncStatus === 'synced'
                ? 'var(--success-soft)'
                : syncStatus === 'offline'
                  ? 'var(--warning-soft)'
                  : 'var(--accent-soft)'
            }
            title={syncTitleMap[syncStatus]}
            subtitle={syncSubtitle}
            onClick={
              platform.name === 'native' && syncStatus !== 'unavailable'
                ? handleSyncNow
                : undefined
            }
          />
        </ListGroup>

        {/* ── Family Sharing (native only) ─────────────────── */}
        {platform.name === 'native' && syncStatus !== 'unavailable' && (
          <ListGroup
            title="Family Sharing"
            footer="Family members need CruiseFlow installed and iCloud enabled."
          >
            <ListRow
              icon={<Share2 className="w-4 h-4" />}
              title="Share this cruise"
              subtitle="Invite others to view and edit together"
              onClick={() => {
                if (platform.sync && activeCruiseId) {
                  platform.sync.shareCruise(activeCruiseId);
                }
              }}
            />
          </ListGroup>
        )}

        {/* ── Backup & Restore ─────────────────────────────── */}
        <ListGroup
          title="Backup & Restore"
          footer="Export all cruises, photos, and members as a .json file."
        >
          <ListRow
            icon={
              backupStatus === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )
            }
            title="Download backup"
            subtitle="Save to your device"
            onClick={backupStatus === 'loading' ? undefined : handleBackup}
          />
          <ListRow
            icon={
              restoreStatus === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )
            }
            title="Restore from backup"
            subtitle="Replace all data with a .json file"
            onClick={
              restoreStatus === 'loading' || restoreStatus === 'confirming'
                ? undefined
                : () => restoreFileRef.current?.click()
            }
          />
        </ListGroup>
        <input
          ref={restoreFileRef}
          type="file"
          accept=".json"
          onChange={handleRestoreFileSelect}
          className="hidden"
        />

        {/* ── Share ────────────────────────────────────────── */}
        <ListGroup title="Share CruiseFlow">
          <ListRow
            icon={<Share2 className="w-4 h-4" />}
            title="Share app link"
            subtitle="Tell friends about CruiseFlow"
            onClick={handleShare}
          />
        </ListGroup>

        {/* ── Danger Zone ──────────────────────────────────── */}
        <ListGroup title="Danger Zone">
          <ListRow
            icon={<Trash2 className="w-4 h-4" />}
            iconBackground="var(--danger-soft)"
            title="Delete this cruise"
            destructive
            onClick={() => setShowDeleteConfirm(true)}
          />
        </ListGroup>

        <div className="pt-2 flex flex-col items-center gap-0.5">
          <Text variant="caption" tone="subtle" align="center">
            CruiseFlow · Made for the sea
          </Text>
          <Text variant="caption" tone="subtle" align="center">
            v{__APP_VERSION__} · build {__BUILD_COMMIT__} ·{' '}
            {new Date(__BUILD_TIME__).toLocaleString()}
          </Text>
        </div>
      </div>

      {/* ── Sheet: Edit cruise ──────────────────────────────── */}
      <Sheet
        open={showCruiseSheet}
        onClose={() => setShowCruiseSheet(false)}
        title="Trip details"
      >
        <div className="px-4 pt-1 pb-4 flex flex-col gap-4">
          <Input
            id="editCruiseName"
            label="Cruise name"
            value={cruiseName}
            onChange={(e) => setCruiseName(e.target.value)}
          />
          <ShipPicker
            id="editShipName"
            label="Ship"
            value={shipName}
            onChange={setShipName}
          />
          {/* #72: editable trip dates so users don't have to delete + recreate. */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="editCruiseStart"
              label="Start"
              type="date"
              value={cruiseStartDate}
              onChange={(e) => setCruiseStartDate(e.target.value)}
            />
            <Input
              id="editCruiseEnd"
              label="End"
              type="date"
              value={cruiseEndDate}
              min={cruiseStartDate || undefined}
              onChange={(e) => setCruiseEndDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowCruiseSheet(false)}
            >
              Cancel
            </Button>
            <Button fullWidth onClick={handleSaveCruise}>
              Save
            </Button>
          </div>
        </div>
      </Sheet>

      {/* ── Sheet: Switch cruise ────────────────────────────── */}
      <Sheet
        open={showCruiseSwitcher}
        onClose={() => setShowCruiseSwitcher(false)}
        title="Your cruises"
      >
        <div className="px-4 pt-1 pb-4 flex flex-col gap-3">
          {cruises.length === 0 ? (
            <Text variant="footnote" tone="muted" align="center" className="py-6">
              No cruises saved yet.
            </Text>
          ) : (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
              }}
            >
              {[...cruises]
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((c, i) => {
                  const active = c.id === activeCruiseId;
                  const line = getCruiseLineForShip(c.shipName);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        if (!active) {
                          setActiveCruise(c.id);
                          // #73: clamp selectedDate into the new cruise's
                          // window so we don't land on an empty day from the
                          // previous trip.
                          setSelectedDate(
                            clampDateToCruise(
                              useAppStore.getState().selectedDate,
                              c.startDate,
                              c.endDate,
                            ),
                          );
                          void haptics.success();
                          toast.success(`Switched to ${c.name}`);
                        }
                        setShowCruiseSwitcher(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 press text-left"
                      style={{
                        borderTop:
                          i === 0 ? 'none' : '1px solid var(--border-default)',
                        backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                        minHeight: 56,
                      }}
                      aria-pressed={active}
                    >
                      <span
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: active
                            ? 'var(--accent)'
                            : 'var(--bg-surface)',
                          color: active ? 'var(--accent-fg)' : 'var(--fg-muted)',
                          border: active ? 'none' : '1px solid var(--border-default)',
                        }}
                        aria-hidden="true"
                      >
                        <Anchor className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-callout font-semibold truncate"
                          style={{ color: 'var(--fg-default)' }}
                        >
                          {c.name}
                        </div>
                        <div
                          className="text-caption truncate"
                          style={{ color: 'var(--fg-subtle)' }}
                        >
                          {c.shipName}
                          {line ? ` · ${line.shortName}` : ''} · {formatTripDate(c.startDate)} → {formatTripDate(c.endDate)}
                        </div>
                      </div>
                      {active && (
                        <Check
                          className="w-5 h-5 shrink-0"
                          style={{ color: 'var(--accent)' }}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
            </div>
          )}
          <Button
            variant="secondary"
            fullWidth
            leadingIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setShowCruiseSwitcher(false);
              handleNewCruise();
            }}
          >
            New cruise
          </Button>
        </div>
      </Sheet>

      {/* ── Sheet: Family members ───────────────────────────── */}
      <Sheet
        open={showFamilySheet}
        onClose={() => {
          setShowFamilySheet(false);
          setEditingMember(null);
        }}
        title="Family members"
      >
        <div className="px-4 pt-1 pb-4 flex flex-col gap-3">
          {members.length === 0 ? (
            <Text variant="footnote" tone="muted" align="center" className="py-4">
              No family members yet
            </Text>
          ) : (
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <MemberAvatar member={m} size="sm" />
                  <span
                    className="flex-1 text-callout font-medium truncate"
                    style={{ color: 'var(--fg-default)' }}
                  >
                    {m.name}
                  </span>
                  {m.isChild && (
                    <span
                      className="text-caption px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: 'var(--accent-soft)',
                        color: 'var(--accent)',
                      }}
                    >
                      Child
                    </span>
                  )}
                  {/* #83: edit-in-place — previously the only action was
                      delete + re-add, which lost any historical event
                      assignments referencing the old member id. */}
                  <button
                    type="button"
                    onClick={() => openEditMember(m)}
                    className="p-2 rounded-full press"
                    style={{ color: 'var(--fg-muted)', minWidth: 36, minHeight: 36 }}
                    aria-label={`Edit ${m.name}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMember(m.id)}
                    className="p-2 rounded-full press"
                    style={{ color: 'var(--fg-muted)', minWidth: 36, minHeight: 36 }}
                    aria-label={`Remove ${m.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* #84: full add-member form with name, emoji, and child toggle. */}
          <div
            className="flex flex-col gap-3 pt-2 mt-2"
            style={{ borderTop: '1px solid var(--border-default)' }}
          >
            <Text variant="footnote" tone="muted">
              Add a person
            </Text>
            <Input
              id="newMember"
              label="Name"
              placeholder="e.g. Alex"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleAddMember();
                }
              }}
            />
            <div className="flex flex-col gap-1.5">
              <span
                className="text-subhead font-medium"
                style={{ color: 'var(--fg-muted)' }}
              >
                Emoji
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MEMBER_EMOJIS.map((emoji) => {
                  const active = newMemberEmoji === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewMemberEmoji(emoji)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg press"
                      style={{
                        backgroundColor: active
                          ? 'var(--accent-soft)'
                          : 'var(--bg-card)',
                        border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                      }}
                      aria-label={`Pick ${emoji}`}
                      aria-pressed={active}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
            <label
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl press cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
              }}
            >
              <input
                type="checkbox"
                checked={newMemberIsChild}
                onChange={(e) => setNewMemberIsChild(e.target.checked)}
                className="w-4 h-4"
              />
              <span
                className="text-callout"
                style={{ color: 'var(--fg-default)' }}
              >
                This person is a child
              </span>
            </label>
            <Button
              onClick={handleAddMember}
              variant="secondary"
              fullWidth
              leadingIcon={<Plus className="w-4 h-4" />}
            >
              Add person
            </Button>
          </div>
        </div>
      </Sheet>

      {/* ── Sheet: Edit family member ───────────────────────── */}
      <Sheet
        open={editingMember !== null}
        onClose={() => setEditingMember(null)}
        title="Edit member"
      >
        {editingMember && (
          <div className="px-4 pt-1 pb-4 flex flex-col gap-3">
            <Input
              id="editMemberName"
              label="Name"
              value={editMemberName}
              onChange={(e) => setEditMemberName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSaveMember();
                }
              }}
            />
            <div className="flex flex-col gap-1.5">
              <span
                className="text-subhead font-medium"
                style={{ color: 'var(--fg-muted)' }}
              >
                Emoji
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MEMBER_EMOJIS.map((emoji) => {
                  const active = editMemberEmoji === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditMemberEmoji(emoji)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg press"
                      style={{
                        backgroundColor: active
                          ? 'var(--accent-soft)'
                          : 'var(--bg-card)',
                        border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                      }}
                      aria-label={`Pick ${emoji}`}
                      aria-pressed={active}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
            <label
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl press cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
              }}
            >
              <input
                type="checkbox"
                checked={editMemberIsChild}
                onChange={(e) => setEditMemberIsChild(e.target.checked)}
                className="w-4 h-4"
              />
              <span
                className="text-callout"
                style={{ color: 'var(--fg-default)' }}
              >
                This person is a child
              </span>
            </label>
            <div className="flex gap-2 pt-1">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setEditingMember(null)}
              >
                Cancel
              </Button>
              <Button fullWidth onClick={handleSaveMember}>
                Save
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      {/* ── Sheet: API key ──────────────────────────────────── */}
      <Sheet
        open={showApiSheet}
        onClose={() => setShowApiSheet(false)}
        title="Gemini API key"
      >
        {/* #91: wrap in a <form> so the on-screen keyboard's Go/Return key
            saves and dismisses the sheet — previously Enter did nothing. */}
        <form
          className="px-4 pt-1 pb-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setShowApiSheet(false);
            void haptics.success();
          }}
        >
          <Text variant="footnote" tone="muted">
            Free from aistudio.google.com/apikey — used only by the cruise
            concierge, stored on this device.
          </Text>
          <div className="relative">
            <Input
              id="apiKey"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              leadingIcon={<Key className="w-4 h-4" />}
              aria-label="API key"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowApiKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 press"
              style={{ color: 'var(--fg-muted)' }}
              aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button type="submit" fullWidth>
            Done
          </Button>
        </form>
      </Sheet>

      {/* ── Sheet: Theme ────────────────────────────────────── */}
      <Sheet
        open={showThemeSheet}
        onClose={() => setShowThemeSheet(false)}
        title="Theme"
      >
        <div
          className="px-2 pt-1 pb-4 flex flex-col"
          role="radiogroup"
          aria-label="Theme preference"
        >
          {(['system', 'dark', 'light'] as ThemePreference[]).map((option) => {
            const Icon = themeIcon[option];
            const active = theme === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setTheme(option);
                  void haptics.tap();
                }}
                className="flex items-center gap-3 px-4 py-3 press rounded-xl"
                style={{
                  color: 'var(--fg-default)',
                  backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                  minHeight: 52,
                }}
              >
                <span
                  className="flex items-center justify-center w-9 h-9 rounded-full shrink-0"
                  style={{
                    backgroundColor: active ? 'var(--accent)' : 'var(--bg-card)',
                    color: active ? 'var(--accent-fg)' : 'var(--fg-muted)',
                    border: active ? 'none' : '1px solid var(--border-default)',
                  }}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
                <div className="flex-1 text-left">
                  <div className="text-callout font-semibold">
                    {themeLabel[option]}
                  </div>
                  <div className="text-footnote" style={{ color: 'var(--fg-muted)' }}>
                    {option === 'system'
                      ? 'Match iOS appearance'
                      : option === 'dark'
                        ? 'Always use dark theme'
                        : 'Always use light theme'}
                  </div>
                </div>
                {active && (
                  <Check className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                )}
              </button>
            );
          })}
        </div>
      </Sheet>

      {/* ── Restore confirmation ────────────────────────────── */}
      {restoreStatus === 'confirming' && restorePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ backgroundColor: 'var(--bg-overlay)' }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-3xl p-5 animate-scale-in"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: 'var(--warning-soft)',
                  color: 'var(--warning)',
                }}
              >
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <Text variant="headline" weight="semibold">
                  Replace all current data?
                </Text>
                <Text variant="footnote" tone="muted" className="mt-1">
                  This backup contains{' '}
                  <strong>{restorePreview.cruises.length}</strong> cruise
                  {restorePreview.cruises.length !== 1 ? 's' : ''},{' '}
                  <strong>{restorePreview.members.length}</strong> member
                  {restorePreview.members.length !== 1 ? 's' : ''}, and{' '}
                  <strong>{restorePreview.events.length}</strong> event
                  {restorePreview.events.length !== 1 ? 's' : ''}.
                </Text>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setRestorePreview(null);
                  setRestoreStatus('idle');
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" fullWidth onClick={handleRestoreConfirm}>
                Replace & Restore
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete cruise confirmation ──────────────────────── */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ backgroundColor: 'var(--bg-overlay)' }}
          role="dialog"
          aria-modal="true"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl p-5 animate-scale-in"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: 'var(--danger-soft)',
                  color: 'var(--danger)',
                }}
              >
                <Trash2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <Text variant="headline" weight="semibold">
                  Delete this cruise?
                </Text>
                <Text variant="footnote" tone="muted" className="mt-1">
                  All events, photos, and family members on this trip will be
                  permanently removed.
                </Text>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button variant="danger" fullWidth onClick={handleDeleteCruise}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
