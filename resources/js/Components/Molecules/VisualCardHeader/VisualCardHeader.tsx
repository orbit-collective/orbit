import { FC } from 'react';
import { VisualCardHeaderProps } from '@/types/Components';

export const VisualCardHeader: FC<VisualCardHeaderProps> = ({
    title,
    description,
}) => {
    return (
        <div className="mb-4">
            <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                {title}
            </span>
            <p className="mt-1 text-xs text-[var(--text-muted-color)]">
                {description}
            </p>
        </div>
    );
};
