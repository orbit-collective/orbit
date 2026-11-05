import { motion } from 'framer-motion';
import React from 'react';
import { cn } from '@/utils/cn';
import { DURATION, SPRING } from '@/utils/motion';

interface SelectionHighlightProps {
    /**
     * Shared by every card of one choice group: the highlight then glides
     * from the card that was picked to the next one (shared layout
     * animation) instead of each card flipping its own border. Without it the
     * highlight just fades in.
     */
    layoutId?: string;
    className?: string;
}

/**
 * The accent frame behind the selected card of a group. Put it first inside a
 * `relative` card and lift the card's content above it (`relative`).
 */
const SelectionHighlight: React.FC<SelectionHighlightProps> = ({
    layoutId,
    className,
}) => (
    <motion.span
        aria-hidden="true"
        data-testid="selection-highlight"
        layoutId={layoutId}
        initial={layoutId ? undefined : { opacity: 0 }}
        animate={layoutId ? undefined : { opacity: 1 }}
        transition={layoutId ? SPRING : { duration: DURATION.fast }}
        className={cn(
            'pointer-events-none absolute inset-0 rounded-xl border border-[var(--accent-color)] bg-[var(--accent-color-opacity)]',
            className,
        )}
    />
);

export default SelectionHighlight;
