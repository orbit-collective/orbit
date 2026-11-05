import { motion } from 'framer-motion';
import React from 'react';
import { riseIn } from '@/utils/motion';
import { useRefreshEpoch } from '@/utils/refreshEpoch';

interface RevealProps {
    className?: string;
    children: React.ReactNode;
}

/**
 * Fades its content up into place when it mounts. Give it a `key` that
 * changes with the content (a loading state becoming real data) and the swap
 * animates. Inside a staggering parent it joins the stagger; on its own it
 * plays straight away.
 */
const Reveal: React.FC<RevealProps> = ({ className, children }) => {
    // A refresh remounts it, so the reveal plays again.
    const epoch = useRefreshEpoch();

    return (
        <motion.div
            key={epoch}
            className={className}
            variants={riseIn}
            initial="hidden"
            animate="show"
        >
            {children}
        </motion.div>
    );
};

export default Reveal;
