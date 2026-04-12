import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ship, Trash2, ArrowRight } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { deleteDemoCruise } from '@/data/seedDemoCruise';
import { useAppStore } from '@/stores/appStore';
import { useCruises } from '@/hooks/useCruise';
import { haptics } from '@/utils/haptics';

interface ExitDemoSheetProps {
  cruiseId: string;
  onClose: () => void;
}

/**
 * #97: Bottom sheet that lets the user exit the demo cruise and either
 * start planning their own cruise or simply delete the demo.
 */
export function ExitDemoSheet({ cruiseId, onClose }: ExitDemoSheetProps) {
  const navigate = useNavigate();
  const setActiveCruise = useAppStore((s) => s.setActiveCruise);
  const cruises = useCruises();
  const [deleting, setDeleting] = useState(false);

  const handleStartPlanning = async () => {
    setDeleting(true);
    try {
      await deleteDemoCruise(cruiseId);
      // If user has other cruises, switch to the first non-demo one
      const otherCruise = cruises?.find((c) => c.id !== cruiseId && !c.isDemo);
      if (otherCruise) {
        setActiveCruise(otherCruise.id);
        navigate('/');
      } else {
        setActiveCruise(null);
        navigate('/onboarding');
      }
      void haptics.success();
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteOnly = async () => {
    setDeleting(true);
    try {
      await deleteDemoCruise(cruiseId);
      const otherCruise = cruises?.find((c) => c.id !== cruiseId && !c.isDemo);
      if (otherCruise) {
        setActiveCruise(otherCruise.id);
        navigate('/');
      } else {
        setActiveCruise(null);
        navigate('/onboarding');
      }
      void haptics.success();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title="Exit Demo" maxHeight={0.55}>
      <div className="px-5 pb-4 flex flex-col gap-4">
        <div
          className="flex items-center gap-3 p-4 rounded-2xl"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            }}
          >
            <Ship className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <Text variant="callout" weight="semibold">
              This is a sample cruise
            </Text>
            <Text variant="caption" tone="muted">
              Everything you see here was pre-filled so you can explore CruiseFlow&rsquo;s features.
            </Text>
          </div>
        </div>

        <Button
          onClick={handleStartPlanning}
          size="lg"
          fullWidth
          isLoading={deleting}
          trailingIcon={<ArrowRight className="w-4 h-4" />}
        >
          Plan My Own Cruise
        </Button>

        <Button
          onClick={handleDeleteOnly}
          variant="secondary"
          size="lg"
          fullWidth
          isLoading={deleting}
          leadingIcon={<Trash2 className="w-4 h-4" />}
        >
          Delete Demo
        </Button>

        <button
          type="button"
          onClick={onClose}
          className="text-center py-2 press"
          style={{ color: 'var(--fg-muted)' }}
        >
          <Text variant="callout" tone="muted">
            Keep exploring
          </Text>
        </button>
      </div>
    </Sheet>
  );
}
