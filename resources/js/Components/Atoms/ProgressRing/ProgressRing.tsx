import { motion } from 'framer-motion';
import React from 'react';
import { ProgressRingProps } from '@/types/Components';
import { DURATION, EASE } from '@/utils/motion';
import { useRefreshEpoch } from '@/utils/refreshEpoch';

/**
 * A ring that draws itself to its value when it appears and sweeps to every
 * new value after, with the shared timing.
 */
const ProgressRing: React.FC<ProgressRingProps> = ({
    radius = 18,
    stroke = 3,
    progress,
    colorClass = 'stroke-(--accent-color)',
    bgColorClass = 'stroke-(--bg-light-color)',
}) => {
    const epoch = useRefreshEpoch();
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <svg
            height={radius * 2}
            width={radius * 2}
            className="shrink-0 -rotate-90"
        >
            <circle
                className={`${bgColorClass} fill-transparent`}
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
            <motion.circle
                key={epoch}
                data-testid="progress-arc"
                data-progress={progress}
                className={`${colorClass} fill-transparent`}
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: DURATION.slow, ease: EASE }}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                strokeLinecap="round"
            />
        </svg>
    );
};

export default ProgressRing;
