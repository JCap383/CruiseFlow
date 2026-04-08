import type { FamilyMember } from '@/types';

interface MemberAvatarProps {
  member: FamilyMember;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-base',
  md: 'w-10 h-10 text-lg',
  lg: 'w-14 h-14 text-2xl',
};

export function MemberAvatar({
  member,
  size = 'md',
  selected,
  onClick,
}: MemberAvatarProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full flex items-center justify-center shrink-0 transition-all ${sizeClasses[size]} ${
        selected === false ? 'opacity-30 scale-90' : ''
      } ${selected === true ? 'ring-2 ring-ocean-400 ring-offset-2 ring-offset-cruise-bg' : ''}`}
      style={{ backgroundColor: member.color + '33' }}
      title={member.name}
    >
      <span>{member.emoji}</span>
    </button>
  );
}

interface MemberChipProps {
  member: FamilyMember;
}

export function MemberChip({ member }: MemberChipProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: member.color + '22',
        color: member.color,
      }}
    >
      <span>{member.emoji}</span>
      {member.name}
    </span>
  );
}
