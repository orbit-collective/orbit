import { FC } from 'react';
import { VisualCardHeaderProps } from '@/types/Components';

export const VisualCardHeader: FC<VisualCardHeaderProps> = ({
    title,
    description,
}) => {
    return (
        <div className="mb-4">
            <span className="block text-xs font-semibold tracking-wider text-(--text-gray-color) uppercase">
                {title}
            </span>
            <p className="mt-1 text-xs text-(--text-muted-color)">
                {description}
            </p>
        </div>
    );
};
