import IconButton from '@/Components/Atoms/IconButton/IconButton';
import { ModalHeaderProps } from '@/types/Components';
import React from 'react';

const ModalHeader: React.FC<ModalHeaderProps> = ({ title, onClose, icon }) => {
    return (
        <header className="flex items-center justify-between border-b border-[var(--bg-light-color)] px-6 py-4">
            <div className="flex items-center gap-3">
                {icon}
                <h2 className="m-0 text-base font-semibold text-[var(--text-color)]">
                    {title}
                </h2>
            </div>
            <IconButton
                iconName="X"
                iconSize={18}
                iconColor="var(--text-gray-color)"
                onClick={onClose}
            />
        </header>
    );
};

export default ModalHeader;
