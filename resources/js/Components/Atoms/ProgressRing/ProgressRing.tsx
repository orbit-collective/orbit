import React from 'react';
import { ProgressRingProps } from '@/types/Components';

const ProgressRing: React.FC<ProgressRingProps> = ({
    radius = 18,
    stroke = 3,
    progress,
    colorClass = 'stroke-[var(--accent-color)]',
    bgColorClass = 'stroke-[var(--bg-light-color)]',
}) => {
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <svg
            height={radius * 2}
            width={radius * 2}
            className="shrink-0 rotate-[-90deg]"
        >
            <circle
                className={`${bgColorClass} fill-transparent`}
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
            <circle
                className={`${colorClass} fill-transparent transition-[stroke-dashoffset] duration-500 ease-out`}
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                strokeLinecap="round"
            />
        </svg>
    );
};

export default ProgressRing;
