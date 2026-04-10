import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ width = '100%', height = 16, radius = 8, className = '', style }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      role="status"
      aria-busy="true"
      aria-label="Loading"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div
      className="w-full p-4 rounded-2xl flex flex-col gap-2"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
    >
      <Skeleton width="40%" height={14} />
      <Skeleton width="80%" height={18} />
      <Skeleton width="60%" height={12} />
    </div>
  );
}
