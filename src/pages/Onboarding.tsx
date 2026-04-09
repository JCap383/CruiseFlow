import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ship, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createCruise } from '@/hooks/useCruise';
import { addMember } from '@/hooks/useFamily';
import { useAppStore } from '@/stores/appStore';
import { MEMBER_COLORS, MEMBER_EMOJIS } from '@/types';
import { getKnownShips } from '@/db/seed';

interface MemberDraft {
  name: string;
  emoji: string;
  isChild: boolean;
}

export function Onboarding() {
  const navigate = useNavigate();
  const setActiveCruise = useAppStore((s) => s.setActiveCruise);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);

  const [step, setStep] = useState<'cruise' | 'members'>('cruise');
  const [cruiseName, setCruiseName] = useState('');
  const [shipName, setShipName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [newName, setNewName] = useState('');

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
    navigate('/');
  };

  return (
    <div className="p-6 flex flex-col gap-6 min-h-full justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ocean-500/20 mb-4">
          <Ship className="w-8 h-8 text-ocean-400" />
        </div>
        <h1 className="text-2xl font-bold">Welcome to CruiseFlow</h1>
        <p className="text-cruise-muted mt-1">
          {step === 'cruise'
            ? 'Set up your cruise to get started'
            : 'Add your travel companions'}
        </p>
      </div>

      {step === 'cruise' ? (
        <div className="flex flex-col gap-4">
          <Input
            id="cruiseName"
            label="Cruise name"
            placeholder="e.g. Caribbean Adventure 2026"
            value={cruiseName}
            onChange={(e) => setCruiseName(e.target.value)}
          />
          <div>
            <Input
              id="shipName"
              label="Ship name"
              placeholder="e.g. NCL Prima"
              value={shipName}
              onChange={(e) => setShipName(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {getKnownShips().map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setShipName(name)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    shipName === name
                      ? 'bg-ocean-500 text-white border-ocean-500'
                      : 'border-cruise-border text-cruise-muted bg-cruise-card'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="startDate"
              label="Start date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              id="endDate"
              label="End date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button
            onClick={() => setStep('members')}
            className="mt-2"
            disabled={!startDate || !endDate}
          >
            Next: Add Family
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Member list */}
          <div className="flex flex-col gap-2">
            {members.map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-cruise-card rounded-xl px-4 py-3 border border-cruise-border"
              >
                <span className="text-xl">{m.emoji}</span>
                <span className="flex-1 font-medium">{m.name}</span>
                <button
                  type="button"
                  onClick={() => toggleChild(i)}
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    m.isChild
                      ? 'bg-pink-500/20 text-pink-400'
                      : 'bg-cruise-border text-cruise-muted'
                  }`}
                >
                  {m.isChild ? 'Child' : 'Adult'}
                </button>
                <button
                  type="button"
                  onClick={() => removeMember(i)}
                  className="text-cruise-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add member input */}
          <div className="flex gap-2">
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
              className="shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              variant="secondary"
              onClick={() => setStep('cruise')}
              className="flex-1"
            >
              Back
            </Button>
            <Button onClick={handleFinish} className="flex-1">
              Start Planning
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
