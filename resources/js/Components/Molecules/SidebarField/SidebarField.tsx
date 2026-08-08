import { SidebarFieldProps } from '@/types/Components';
import React from 'react';

const SidebarField: React.FC<SidebarFieldProps> = ({ label, children }) => {
    return (
        <div className="flex flex-col items-start gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted-color)]">
                {label}
            </label>
            {children}
        </div>
    );
};

export default SidebarField;
