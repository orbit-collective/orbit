import type { icons } from 'lucide-react';
import { ReactNode } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { cn } from '@/utils/cn';
import { PillTone } from '@/utils/development';

interface StatusPillProps {
    tone: PillTone;
    icon: keyof typeof icons;
    children: ReactNode;
    /** A pill whose state is still changing (a CI run in progress) spins its icon. */
    spinning?: boolean;
    className?: string;
}

// Spelled out in full so Tailwind sees every class.
const TONES: Record<PillTone, string> = {
    success:
        'border-(--success-color)/30 bg-(--success-color)/10 text-(--success-color)',
    danger: 'border-(--error-color)/30 bg-(--error-color)/10 text-(--error-color)',
    warning:
        'border-(--warning-color)/30 bg-(--warning-color)/10 text-(--warning-color)',
    info: 'border-(--info-color)/30 bg-(--info-color)/10 text-(--info-color)',
    accent: 'border-(--accent-color)/30 bg-(--accent-color-opacity) text-(--accent-color)',
    neutral:
        'border-(--border-color) bg-(--bg-light-color) text-(--text-gray-color)',
};

/**
 * A small rounded state label: an icon and a word, coloured by tone. The word
 * is always there, so the colour is never the only carrier of the state.
 */
export default function StatusPill({
    tone,
    icon,
    children,
    spinning = false,
    className,
}: StatusPillProps) {
    return (
        <span
            data-tone={tone}
            className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap',
                TONES[tone],
                className,
            )}
        >
            <Icon
                name={icon}
                size={12}
                className={cn(
                    spinning && 'animate-spin motion-reduce:animate-none',
                )}
            />
            {children}
        </span>
    );
}
