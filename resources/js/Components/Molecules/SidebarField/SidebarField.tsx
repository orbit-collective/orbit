import { motion } from 'framer-motion';
import React from 'react';
import { SidebarFieldProps } from '@/types/Components';
import { rowIn } from '@/utils/motion';

const SidebarField: React.FC<SidebarFieldProps> = ({ label, children }) => {
    return (
        // Inside a staggering page the fields rise one after another; on its
        // own (a form) it just renders.
        <motion.div
            variants={rowIn}
            className="flex flex-col items-start gap-1"
        >
            <label className="text-[10px] font-semibold tracking-wider text-(--text-muted-color) uppercase">
                {label}
            </label>
            {children}
        </motion.div>
    );
};

export default SidebarField;
