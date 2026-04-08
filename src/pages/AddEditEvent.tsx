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
  const existingEvent = useEvent(id === 'new' ? undefined : id);
  const members = useFamily();

  if (!activeCruiseId) {
    navigate('/onboarding');
    return null;
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
    <div className="p-4">
      <h1 className="text-lg font-bold mb-4">
        {existingEvent ? 'Edit Event' : 'New Event'}
      </h1>
      <EventForm
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
