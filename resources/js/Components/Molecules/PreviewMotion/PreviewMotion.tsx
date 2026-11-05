import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import {
    previewGrow,
    previewPop,
    previewRise,
    previewStage,
} from '@/utils/motion';

interface PartProps {
    className?: string;
    children?: React.ReactNode;
}

/**
 * The root of a mock-up that draws itself. Its parts (`PreviewBar`,
 * `PreviewDot`, `PreviewBlock`) animate one after another. Give it a `playKey`
 * that changes to draw it again (e.g. when its card becomes selected).
 */
export function PreviewStage({
    playKey = 0,
    className,
    children,
}: PartProps & { playKey?: number | string }) {
    return (
        <motion.div
            key={playKey}
            variants={previewStage}
            initial="hidden"
            animate="show"
            className={className}
        >
            {children}
        </motion.div>
    );
}

/** A bar or line that grows in from its left edge. */
export function PreviewBar({ className, children }: PartProps) {
    return (
        <motion.div
            variants={previewGrow}
            style={{ transformOrigin: 'left' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/** A dot or badge that pops in. */
export function PreviewDot({ className, children }: PartProps) {
    return (
        <motion.span variants={previewPop} className={className}>
            {children}
        </motion.span>
    );
}

/** A block or row that rises into place. */
export function PreviewBlock({ className, children }: PartProps) {
    return (
        <motion.div variants={previewRise} className={className}>
            {children}
        </motion.div>
    );
}

/**
 * A counter that goes up each time `active` turns true, for `PreviewStage`'s
 * `playKey`: the mock-up of a card redraws when the card is picked.
 */
export function usePlayOnSelect(active: boolean): number {
    const [plays, setPlays] = useState(0);

    useEffect(() => {
        if (active) setPlays((count) => count + 1);
    }, [active]);

    return plays;
}
