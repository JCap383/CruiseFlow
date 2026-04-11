import { useNavigate, useParams } from 'react-router-dom';
import { Ship } from 'lucide-react';
import { useCruiseRecap } from '@/hooks/useCruiseRecap';
import { RecapPlayer } from '@/components/recap/RecapPlayer';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

/**
 * #96: Full-screen recap page, accessible at `/cruise/:id/recap`.
 *
 * This is a thin page: it resolves the cruise id from the URL, feeds it to
 * the `useCruiseRecap` hook, and hands the resulting cards off to the
 * player. On close we navigate back to wherever the user came from (or
 * fall back to /memories).
 */
export function CruiseRecap() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { cruise, cards, isReady } = useCruiseRecap(id ?? null);

  const close = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/memories');
    }
  };

  // Hook still resolving cruise from DB — show a short loading state.
  if (!isReady) {
    return <LoadingOverlay message="Loading your story..." />;
  }

  // Bad id or deleted cruise.
  if (!cruise) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: '#07070c', color: '#fff' }}
      >
        <Ship className="w-10 h-10 mb-4 opacity-70" />
        <Text variant="title3" weight="bold">
          Story not found
        </Text>
        <Text variant="footnote" tone="muted" className="mt-2">
          This cruise has been removed or never existed.
        </Text>
        <Button onClick={() => navigate('/memories')} className="mt-6">
          Back to memories
        </Button>
      </div>
    );
  }

  // Degenerate: a cruise with literally nothing in it. Instead of
  // crashing the player with an empty card list, show a friendly empty
  // state and funnel the user back to the memories page.
  if (cards.length <= 1) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={{
          background:
            'radial-gradient(ellipse at top, #3b1f5e 0%, #0b0f2e 55%, #020611 100%)',
          color: '#fff',
        }}
      >
        <Ship className="w-10 h-10 mb-4 opacity-80" />
        <Text variant="title3" weight="bold">
          Not enough memories yet
        </Text>
        <Text variant="footnote" tone="muted" className="mt-2 max-w-xs">
          Add a few events and photos to {cruise.name}, then come back to see
          your story.
        </Text>
        <Button onClick={() => navigate('/memories')} className="mt-6">
          Back to memories
        </Button>
      </div>
    );
  }

  return <RecapPlayer cards={cards} onClose={close} />;
}
