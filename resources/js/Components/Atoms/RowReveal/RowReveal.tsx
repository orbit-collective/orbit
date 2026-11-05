import { motion } from 'framer-motion';
import React from 'react';
import { RowRevealProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { rowIn, rowDelay } from '@/utils/motion';

/**
 * A list row, card or item that rises into place when it mounts, a little
 * after the one before it (the stagger is capped, so a long list does not
 * crawl). Starts on its own, which is what rows inside a foldable panel need:
 * the panel's body animates open/closed, so rows cannot inherit a parent's
 * entrance. In a grid, pass `fill` so the card still stretches to its cell.
 */
const RowReveal: React.FC<RowRevealProps> = ({
    index = 0,
    fill = false,
    className,
    children,
}) => (
    <motion.div
        className={cn(
            // In a grid the wrapper is the cell: its child must still fill it.
            fill && 'h-full [&>*]:h-full [&>*]:w-full',
            className,
        )}
        variants={rowIn}
        initial="hidden"
        animate="show"
        transition={{ delay: rowDelay(index) }}
    >
        {children}
    </motion.div>
);

export default RowReveal;
