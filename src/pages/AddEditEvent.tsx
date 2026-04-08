import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { useEvent, addEvent, updateEvent } from '@/hooks/useEvents';
import { useFamily } from '@/hooks/useFamily';
import { EventForm } from '@/components/events/EventForm';
import type { CruiseEvent } from '@/types';

export function AddEditEvent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { activeCruiseId, selectedDate } = useAppStore();
  const isEdit = id !== 'new' && id !== undefined;
  const existingEvent = useEvent(isEdit ? id : undefined);
  const members = useFamily();

  // Redirect to onboarding if no cruise — done in effect, not during render
  useEffect(() => {
    if (!activeCruiseId) {
      navigate('/onboarding', { replace: true });
    }
  }, [activeCruiseId, navigate]);

  if (!activeCruiseId) return null;

  // Show loading state while fetching event data in edit mode
  if (isEdit && existingEvent === undefined) {
    return (
      <div className="px-4 pt-2 pb-4">
        <h1 className="text-lg font-bold mb-4">Edit Event</h1>
        <p className="text-cruise-muted text-sm">Loading...</p>
      </div>
    );
  }

  const handleSubmit = async (
    data: Omit<CruiseEvent, 'id' | 'createdAt' | 'updatedAt'>,
  ) => {
    if (existingEvent) {
      await updateEvent(existingEvent.id, data);
    } else {
      await addEvent(data);
    }
    navigate(-1);
  };

  return (
    <div className="px-4 pt-2 pb-4">
      <h1 className="text-lg font-bold mb-4">
        {existingEvent ? 'Edit Event' : 'New Event'}
      </h1>
      <EventForm
        key={existingEvent?.id ?? 'new'}
        initialData={existingEvent ?? undefined}
        members={members}
        cruiseId={activeCruiseId}
        date={existingEvent?.date ?? selectedDate}
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
