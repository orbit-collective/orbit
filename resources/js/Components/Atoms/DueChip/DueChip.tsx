import { motion } from 'framer-motion';
import { FC } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { cn } from '@/utils/cn';
import { DueTone, dueInfo } from '@/utils/dueDate';
import { SPRING } from '@/utils/motion';

const TONES: Record<
    DueTone,
    {
        chip: string;
        icon: 'CircleAlert' | 'Clock' | 'CalendarClock' | 'Calendar';
    }
> = {
    overdue: {
        chip: 'bg-[color-mix(in_srgb,var(--error-color)_14%,transparent)] text-[var(--error-color)]',
        icon: 'CircleAlert',
    },
    today: {
        chip: 'bg-[color-mix(in_srgb,var(--warning-color)_16%,transparent)] text-[var(--warning-color)]',
        icon: 'Clock',
    },
    soon: {
        chip: 'bg-[color-mix(in_srgb,var(--accent-color)_14%,transparent)] text-[var(--accent-color)]',
        icon: 'CalendarClock',
    },
    later: {
        chip: 'bg-[var(--bg-light-color)] text-[var(--text-gray-color)]',
        icon: 'Calendar',
    },
};

interface DueChipProps {
    /** `YYYY-MM-DD`. */
    endDate: string;
    /** What "today" is; the real one by default. */
    now?: Date;
    className?: string;
}

/**
 * When an issue is due, as a chip: a word for how far (or how late), an icon
 * and a tone, so it is not told by color alone. Assistive technology hears a
 * full sentence ("due in 3 days") instead of the short label.
 */
const DueChip: FC<DueChipProps> = ({ endDate, now, className }) => {
    const info = dueInfo(endDate, now);
    const tone = TONES[info.tone];

    return (
        <motion.span
            data-testid="due-chip"
            data-tone={info.tone}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={SPRING}
            className={cn(
                'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                tone.chip,
                className,
            )}
        >
            <Icon name={tone.icon} size={10} className="shrink-0" />
            <span aria-hidden="true">{info.label}</span>
            <span className="sr-only">{info.spoken}</span>
        </motion.span>
    );
};

export default DueChip;
