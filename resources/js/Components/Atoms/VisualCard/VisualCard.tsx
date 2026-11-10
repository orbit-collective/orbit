import { FC } from 'react';
import { VisualCardProps } from '@/types/Components';

export const VisualCard: FC<VisualCardProps> = ({
    children,
    className = '',
}) => {
    return (
        <div
            className={`flex flex-col justify-between rounded-lg border border-solid border-(--border-color) bg-(--surface-color) p-5 transition-all hover:border-(--border-color-strong) hover:bg-(--bg-light-color-hover) ${className}`}
        >
            {children}
        </div>
    );
};
