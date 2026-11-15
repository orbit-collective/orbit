import { cva } from 'class-variance-authority';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import React from 'react';
import { AvatarProps } from '@/types/Components';

const classVariants = cva(
    'flex items-center justify-center rounded-full overflow-hidden shrink-0',
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
    const { t } = useLaravelReactI18n();
    return (
        <div className={classVariants({ size })}>
            {src ? (
                <img
                    src={src}
                    alt={alt || t('avatar.alt')}
                    className={'h-full w-full object-cover'}
                />
            ) : (
                <span className="font-medium text-(--text-color)">
                    {initials}
                </span>
            )}
        </div>
    );
};

export default Avatar;
