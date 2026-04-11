import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ship,
  Sparkles,
  Calendar,
  Users,
  Camera,
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { ShipPicker } from '@/components/ships/ShipPicker';
import { createCruise } from '@/hooks/useCruise';
import { addMember } from '@/hooks/useFamily';
import { useAppStore } from '@/stores/appStore';
import { MEMBER_COLORS, MEMBER_EMOJIS } from '@/types';
import { haptics } from '@/utils/haptics';

type Step = 'welcome' | 'cruise' | 'members';

interface MemberDraft {
  name: string;
  emoji: string;
  isChild: boolean;
}

const STEPS: Step[] = ['welcome', 'cruise', 'members'];

export function Onboarding() {
  const navigate = useNavigate();
  const setActiveCruise = useAppStore((s) => s.setActiveCruise);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);

  const [step, setStep] = useState<Step>('welcome');
  const [cruiseName, setCruiseName] = useState('');
  const [shipName, setShipName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const stepIndex = STEPS.indexOf(step);

  const goNext = () => {
    if (step === 'welcome') setStep('cruise');
    else if (step === 'cruise') setStep('members');
    void haptics.tap();
  };
  const goBack = () => {
    if (step === 'members') setStep('cruise');
    else if (step === 'cruise') setStep('welcome');
    void haptics.tap();
  };

  const addNewMember = () => {
    if (!newName.trim()) return;
    setMembers((prev) => [
      ...prev,
      {
        name: newName.trim(),
        emoji: MEMBER_EMOJIS[prev.length % MEMBER_EMOJIS.length]!,
        isChild: false,
      },
    ]);
    setNewName('');
    void haptics.tap();
  };

  const removeMember = (idx: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleChild = (idx: number) => {
    setMembers((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, isChild: !m.isChild } : m)),
    );
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      const cruiseId = await createCruise({
        name: cruiseName || shipName || 'My Cruise',
        shipName,
        startDate,
        endDate,
        coverPhotos: {},
      });

      await Promise.all(
        members.map((m, i) =>
          addMember({
            cruiseId,
            name: m.name,
            emoji: m.emoji,
            color: MEMBER_COLORS[i % MEMBER_COLORS.length]!,
            isChild: m.isChild,
          }),
        ),
      );

      setActiveCruise(cruiseId);
      if (startDate) setSelectedDate(startDate);
      void haptics.success();
      navigate('/');
    } finally {
      setSubmitting(false);
    }
  };

  const cruiseStepValid =
    !!startDate && !!endDate && !dateError && endDate > startDate;

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto flex flex-col"
      style={{ backgroundColor: 'var(--bg-default)' }}
    >
      {/* Progress dots */}
      <div className="pt-10 pb-4 px-6 flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 'welcome'}
          className="w-10 h-10 rounded-full flex items-center justify-center press disabled:opacity-0"
          style={{ color: 'var(--fg-muted)' }}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === stepIndex ? 28 : 8,
                backgroundColor: i <= stepIndex ? 'var(--accent)' : 'var(--border-default)',
              }}
            />
          ))}
        </div>
        <div className="w-10" />
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col px-6 pb-8">
        {step === 'welcome' && <WelcomeStep onNext={goNext} />}
        {step === 'cruise' && (
          <CruiseStep
            cruiseName={cruiseName}
            setCruiseName={setCruiseName}
            shipName={shipName}
            setShipName={setShipName}
            startDate={startDate}
            endDate={endDate}
            dateError={dateError}
            setStartDate={(v) => {
              setStartDate(v);
              if (endDate && v && endDate <= v) setDateError('End date must be after start date');
              else setDateError('');
            }}
            setEndDate={(v) => {
              setEndDate(v);
              if (startDate && v && v <= startDate) setDateError('End date must be after start date');
              else setDateError('');
            }}
            onNext={goNext}
            canContinue={cruiseStepValid}
          />
        )}
        {step === 'members' && (
          <MembersStep
            members={members}
            newName={newName}
            setNewName={setNewName}
            addNewMember={addNewMember}
            removeMember={removeMember}
            toggleChild={toggleChild}
            onFinish={handleFinish}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-slide-up">
      {/* Hero */}
      <div
        className="relative w-28 h-28 rounded-[32px] flex items-center justify-center mb-6"
        style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, #0369a1 100%)',
          boxShadow: 'var(--shadow-fab)',
        }}
      >
        <Ship className="w-14 h-14 text-white" strokeWidth={1.5} aria-hidden="true" />
        <span
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#fbbf24', color: '#78350f' }}
          aria-hidden="true"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </span>
      </div>

      <Text variant="largeTitle" weight="bold" align="center">
        Welcome to CruiseFlow
      </Text>
      <Text variant="callout" tone="muted" align="center" className="mt-2 max-w-xs">
        Your cruise command center. Plan each day, share with family, and capture the memories.
      </Text>

      {/* Value props */}
      <div className="mt-10 w-full max-w-xs flex flex-col gap-3">
        {[
          { icon: Calendar, label: 'Plan every day of your trip' },
          { icon: Users, label: 'Share schedules with your family' },
          { icon: Camera, label: 'Keep a journal of memories' },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
            }}
          >
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
              aria-hidden="true"
            >
              <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
            </span>
            <Text variant="callout">{label}</Text>
          </div>
        ))}
      </div>

      <Button
        onClick={onNext}
        size="lg"
        fullWidth
        trailingIcon={<ArrowRight className="w-4 h-4" />}
        className="mt-10 max-w-xs"
      >
        Get Started
      </Button>
    </div>
  );
}

function CruiseStep({
  cruiseName,
  setCruiseName,
  shipName,
  setShipName,
  startDate,
  endDate,
  dateError,
  setStartDate,
  setEndDate,
  onNext,
  canContinue,
}: {
  cruiseName: string;
  setCruiseName: (v: string) => void;
  shipName: string;
  setShipName: (v: string) => void;
  startDate: string;
  endDate: string;
  dateError: string;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  onNext: () => void;
  canContinue: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col animate-fade-slide-up">
      <div className="mb-6">
        <Text variant="title1" weight="bold">Tell us about your trip</Text>
        <Text variant="callout" tone="muted" className="mt-1">
          We'll use this to set up your itinerary.
        </Text>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          id="cruiseName"
          label="Cruise name"
          placeholder="e.g. Caribbean Adventure 2026"
          value={cruiseName}
          onChange={(e) => setCruiseName(e.target.value)}
        />

        <ShipPicker
          id="shipName"
          label="Ship"
          value={shipName}
          onChange={setShipName}
          placeholder="Select a ship"
        />
        <Text variant="caption" tone="subtle" className="-mt-2 ml-1">
          Ships are grouped by cruise line. Selecting a known ship loads its
          venues automatically.
        </Text>

        {/* Dates */}
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4" style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <Text variant="subhead" weight="semibold">Trip dates</Text>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="startDate"
              label="Start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              error={dateError && startDate ? ' ' : undefined}
            />
            <Input
              id="endDate"
              label="End"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              error={dateError ? dateError : undefined}
            />
          </div>
        </div>
      </div>

      <Button
        onClick={onNext}
        size="lg"
        fullWidth
        disabled={!canContinue}
        trailingIcon={<ArrowRight className="w-4 h-4" />}
        className="mt-6"
      >
        Next: Add Family
      </Button>
    </div>
  );
}

function MembersStep({
  members,
  newName,
  setNewName,
  addNewMember,
  removeMember,
  toggleChild,
  onFinish,
  submitting,
}: {
  members: MemberDraft[];
  newName: string;
  setNewName: (v: string) => void;
  addNewMember: () => void;
  removeMember: (idx: number) => void;
  toggleChild: (idx: number) => void;
  onFinish: () => void;
  submitting: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col animate-fade-slide-up">
      <div className="mb-6">
        <Text variant="title1" weight="bold">Who's going?</Text>
        <Text variant="callout" tone="muted" className="mt-1">
          Add everyone on the trip so you can assign activities.
        </Text>
      </div>

      {/* Member list or empty hint */}
      {members.length === 0 ? (
        <div
          className="rounded-2xl p-6 text-center"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px dashed var(--border-strong)',
          }}
        >
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
            aria-hidden="true"
          >
            <Users className="w-6 h-6" />
          </div>
          <Text variant="callout" tone="muted">
            No family members yet — you can skip this or add them below.
          </Text>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
              }}
            >
              <span className="text-xl">{m.emoji}</span>
              <Text variant="callout" weight="medium" className="flex-1 truncate">
                {m.name}
              </Text>
              <button
                type="button"
                onClick={() => toggleChild(i)}
                className="text-caption px-2.5 py-1 rounded-full press"
                style={{
                  backgroundColor: m.isChild ? 'var(--warning-soft)' : 'var(--bg-elevated)',
                  color: m.isChild ? 'var(--warning)' : 'var(--fg-muted)',
                }}
                aria-pressed={m.isChild}
              >
                {m.isChild ? 'Child' : 'Adult'}
              </button>
              <button
                type="button"
                onClick={() => removeMember(i)}
                className="p-1 press"
                style={{ color: 'var(--fg-muted)' }}
                aria-label={`Remove ${m.name}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      <div className="flex gap-2 mt-4">
        <Input
          id="newMember"
          placeholder="Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addNewMember();
            }
          }}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={addNewMember}
          variant="secondary"
          size="md"
          className="shrink-0"
          aria-label="Add member"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1" />

      <Button
        onClick={onFinish}
        size="lg"
        fullWidth
        isLoading={submitting}
        haptic="success"
        leadingIcon={<Check className="w-4 h-4" />}
        className="mt-6"
      >
        Start Planning
      </Button>
    </div>
  );
}
