import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Text } from '@/components/ui/Text';
import type { Cruise } from '@/types';
import { ExitDemoSheet } from './ExitDemoSheet';

interface DemoBannerProps {
  cruise: Cruise;
}

/**
 * #97: Thin banner shown at the top of every page when the active cruise
 * is a demo cruise. Tapping it opens the ExitDemoSheet.
 */
export function DemoBanner({ cruise }: DemoBannerProps) {
  const [showSheet, setShowSheet] = useState(false);

  if (!cruise.isDemo) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowSheet(true)}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 press"
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
          color: '#fff',
        }}
      >
        <Eye className="w-3.5 h-3.5" />
        <Text variant="caption" weight="semibold" className="!text-white">
          You&rsquo;re exploring a demo cruise
        </Text>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ml-1"
          style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
        >
          Exit
        </span>
      </button>
      {showSheet && (
        <ExitDemoSheet
          cruiseId={cruise.id}
          onClose={() => setShowSheet(false)}
        />
      )}
    </>
  );
}
