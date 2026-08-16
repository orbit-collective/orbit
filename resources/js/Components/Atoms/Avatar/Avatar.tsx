import { AvatarProps } from '@/types/Components';
import { cva } from 'class-variance-authority';
import React from 'react';

const classVariants = cva(
    'flex items-center justify-center rounded-full overflow-hidden border border-[var(--border-color)] bg-[var(--bg-light-color)] shrink-0',
    {
        variants: {
            size: {
                sm: 'w-5 h-5 text-[10px]',
                md: 'w-6 h-6 text-xs',
                lg: 'w-8 h-8 text-sm',
                xl: 'w-14 h-14 text-lg',
            },
        },
        defaultVariants: {
            size: 'md',
        },
    },
);

const Avatar: React.FC<AvatarProps> = ({ src, alt, size = 'md', initials }) => {
    return (
        <div className={classVariants({ size })}>
            {src ? (
                <img
                    src={src}
                    alt={alt || 'Avatar'}
                    className={'h-full w-full object-cover'}
                />
            ) : (
                <span className="font-medium text-[var(--text-color)]">
                    {initials}
                </span>
            )}
        </div>
    );
};

export default Avatar;
