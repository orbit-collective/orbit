import { MotionConfig, motion } from 'framer-motion';
import React from 'react';
import { PageSectionProps, PageStageProps } from '@/types/Components';
import { riseIn, staggerParent } from '@/utils/motion';

const elements = {
    div: motion.div,
    main: motion.main,
    section: motion.section,
} as const;

/**
 * The content area of a page: its `PageSection`s rise in one after another
 * with the shared easing and stagger. Respects reduced motion.
 */
export const PageStage: React.FC<PageStageProps> = ({
    as = 'div',
    className,
    children,
}) => {
    const Element = elements[as];

    return (
        <MotionConfig reducedMotion="user">
            <Element
                variants={staggerParent}
                initial="hidden"
                animate="show"
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
    children,
}) => (
    <motion.div variants={riseIn} className={className}>
        {children}
    </motion.div>
);
