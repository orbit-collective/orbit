import { motion } from 'framer-motion';
import React from 'react';
import { collapseVariants } from '@/utils/motion';

interface CollapseProps {
    open: boolean;
    id?: string;
    className?: string;
    children: React.ReactNode;
}

/**
 * Animates a body open and closed (height and a soft fade) with the app's
 * shared timing. Children stay mounted, so state inside survives a fold, but
 * a closed body is `visibility: hidden`: out of the TAB order and the
 * accessibility tree. Overflow is only clipped while moving, so tooltips and
 * focus rings are never cut off when open. No animation on first render.
 */
const Collapse: React.FC<CollapseProps> = ({
    open,
    id,
    className,
    children,
}) => (
    <motion.div
        id={id}
        className={className}
        variants={collapseVariants}
        initial={false}
        animate={open ? 'open' : 'closed'}
    >
        {children}
    </motion.div>
);

export default Collapse;
