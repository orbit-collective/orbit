import { motion } from 'framer-motion';
import React from 'react';
import { cn } from '@/utils/cn';

interface SkeletonProps {
    className?: string;
    /** Pulses start a little apart so a stack of skeletons ripples. */
    index?: number;
}

/**
 * A placeholder block for content that is on its way. It breathes softly
 * instead of blinking; with Reduced Motion it just sits there.
 */
const Skeleton: React.FC<SkeletonProps> = ({ className, index = 0 }) => (
    <motion.span
        data-testid="skeleton"
        aria-hidden="true"
        className={cn('block rounded-md bg-[var(--bg-light-color)]', className)}
        initial={{ opacity: 0.45 }}
        animate={{ opacity: [0.45, 0.9, 0.45] }}
        transition={{
            duration: 1.6,
            ease: 'easeInOut',
            repeat: Infinity,
            delay: index * 0.12,
        }}
    />
);

export default Skeleton;
