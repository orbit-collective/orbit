import { MotionConfig, motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { PageSectionProps, PageStageProps } from '@/types/Components';
import { DURATION, riseIn, staggerParent } from '@/utils/motion';
import { useRefreshEpoch } from '@/utils/refreshEpoch';

/** How long the sections stay out before they rise in again. */
const REPLAY_GAP_SECONDS = DURATION.fast + 0.05;

const elements = {
    div: motion.div,
    main: motion.main,
    section: motion.section,
} as const;

/**
 * The content area of a page: its `PageSection`s rise in one after another
 * with the shared easing and stagger, on load and again after a refresh.
 * Respects reduced motion.
 */
export const PageStage: React.FC<PageStageProps> = ({
    as = 'div',
    className,
    children,
}) => {
    const Element = elements[as];
    const epoch = useRefreshEpoch();
    const [phase, setPhase] = useState<'hidden' | 'show'>('show');
    const seen = useRef(epoch);

    // After the Refresh button the sections fade out and rise in again one
    // after another. Nothing remounts, so scroll position and state stay.
    useEffect(() => {
        if (epoch === seen.current) return;
        seen.current = epoch;

        setPhase('hidden');
        const timer = setTimeout(
            () => setPhase('show'),
            REPLAY_GAP_SECONDS * 1000,
        );

        return () => clearTimeout(timer);
    }, [epoch]);

    return (
        <MotionConfig reducedMotion="user">
            <Element
                variants={staggerParent}
                initial="hidden"
                animate={phase}
                className={className}
            >
                {children}
            </Element>
        </MotionConfig>
    );
};

/** One block of a page; rises in when its `PageStage` staggers it. */
export const PageSection: React.FC<PageSectionProps> = ({
    className,
    style,
    children,
}) => (
    <motion.div variants={riseIn} className={className} style={style}>
        {children}
    </motion.div>
);
