import { motion } from 'framer-motion';
import React from 'react';
import { rowIn } from '@/utils/motion';

interface SettingsPanelRowProps {
    title: string;
    description?: string;
    action?: React.ReactNode;
    children?: React.ReactNode;
}

/**
 * One row of a settings panel. Inside a panel the rows rise in one after
 * another (the panel body staggers them, and a row mounted later joins in).
 */
export default function SettingsPanelRow({
    title,
    description,
    action,
    children,
}: SettingsPanelRowProps) {
    return (
        <motion.div
            variants={rowIn}
            className="flex flex-col gap-3 px-4 py-4 transition-colors duration-200 hover:bg-(--bg-light-color) sm:px-5"
        >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-(--text-color)">
                        {title}
                    </p>
                    {description && (
                        <p className="text-sm text-(--text-gray-color)">
                            {description}
                        </p>
                    )}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            {children}
        </motion.div>
    );
}
