import Badge from '@/Components/Atoms/Badge/Badge';
import { UserBadgeProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { cva } from 'class-variance-authority';
import React from 'react';
import Avatar from '../../Atoms/Avatar/Avatar';

const classVariants = cva(
    'flex items-center gap-2.5 text-[var(--text-color)]',
    {
        variants: {
            size: {
                sm: 'gap-1.5',
                md: 'gap-2.5',
                lg: 'gap-3.5',
            },
        },
        defaultVariants: {
            size: 'md',
        },
    },
);

const UserBadge: React.FC<UserBadgeProps> = ({
    name,
    email,
    avatarSrc,
    size = 'md',
    showDetails = false,
    showName = true,
    showTooltip = true,
    className,
}) => {
    return (
        <Badge
            className={cn(
                classVariants({ size }),
                'w-fit self-start',
                className,
            )}
            variant={'avatar'}
            tooltip={showTooltip}
        >
            <Avatar src={avatarSrc} initials={name.charAt(0)} size={size} />
            <div className={'flex min-w-0 flex-col'}>
                <span
                    className={`overflow-hidden overflow-ellipsis whitespace-nowrap text-sm font-normal ${avatarSrc ? 'text-[var(--text-color)]' : 'text-[var(--text-gray-color)]'}`}
                >
                    {showName && name}
                </span>
                {showDetails && email && (
                    <span
                        className={
                            'text-2xs overflow-hidden overflow-ellipsis whitespace-nowrap font-normal text-[var(--text-gray-color)]'
                        }
                    >
                        {email}
                    </span>
                )}
            </div>
        </Badge>
    );
};

export default UserBadge;
