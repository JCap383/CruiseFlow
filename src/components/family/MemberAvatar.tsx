import type { FamilyMember } from '@/types';

interface MemberAvatarProps {
  member: FamilyMember;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  selected?: boolean;
  onClick?: () => void;
}

const sizePx: Record<NonNullable<MemberAvatarProps['size']>, { d: number; font: number }> = {
  sm: { d: 32, font: 16 },
  md: { d: 40, font: 20 },
  lg: { d: 56, font: 28 },
  xl: { d: 72, font: 36 },
};

export function MemberAvatar({
  member,
  size = 'md',
  selected,
  onClick,
}: MemberAvatarProps) {
  const { d, font } = sizePx[size];
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full flex items-center justify-center shrink-0 press"
      style={{
        width: d,
        height: d,
        fontSize: font,
        backgroundColor: member.color + '33',
        border: selected === true ? `2px solid var(--accent)` : '2px solid transparent',
        boxShadow: selected === true ? '0 0 0 3px var(--accent-soft)' : 'none',
        opacity: selected === false ? 0.4 : 1,
      }}
      title={member.name}
      aria-pressed={selected ?? undefined}
    >
      <span aria-hidden="true">{member.emoji}</span>
    </button>
  );
}

interface MemberChipProps {
  member: FamilyMember;
}

export function MemberChip({ member }: MemberChipProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-footnote font-medium"
      style={{
        backgroundColor: member.color + '22',
        color: member.color,
      }}
    >
      <span aria-hidden="true">{member.emoji}</span>
      {member.name}
    </span>
  );
}
