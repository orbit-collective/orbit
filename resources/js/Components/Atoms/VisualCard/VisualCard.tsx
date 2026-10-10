import { FC } from 'react';
import { VisualCardProps } from '@/types/Components';

export const VisualCard: FC<VisualCardProps> = ({
    children,
    className = '',
}) => {
    return (
        <div
            className={`flex flex-col justify-between rounded-lg border border-solid border-[var(--border-color)] bg-[var(--surface-color)] p-5 transition-all hover:border-[var(--border-color-strong)] hover:bg-[var(--bg-light-color-hover)] ${className}`}
        >
            {children}
        </div>
    );
};
