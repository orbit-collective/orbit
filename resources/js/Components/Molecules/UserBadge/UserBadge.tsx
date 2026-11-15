import { cva } from 'class-variance-authority';
import React from 'react';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Badge from '@/Components/Atoms/Badge/Badge';
import { UserBadgeProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import UserAvatar from '../UserAvatar/UserAvatar';

const classVariants = cva('flex items-center gap-2.5 text-(--text-color)', {
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
});

const UserBadge: React.FC<UserBadgeProps> = ({
    name,
    email,
    avatarSrc,
    userId,
    size = 'md',
    showDetails = false,
    showName = true,
    showTooltip = true,
    className,
}) => {
    // The tooltip repeats the badge's content, so its copy must use the plain
    // avatar: a second UserAvatar would also react to the surrounding
    // control's focus and open a second preview card.
    const content = (interactive: boolean) => (
        <>
            {interactive ? (
                <UserAvatar
                    src={avatarSrc}
                    initials={name.charAt(0)}
                    size={size}
                    userId={userId}
                />
            ) : (
                <Avatar src={avatarSrc} initials={name.charAt(0)} size={size} />
            )}
            {(showName || (showDetails && email)) && (
                <div className={'flex min-w-0 flex-col'}>
                    {showName && (
                        <span
                            className={`overflow-hidden text-sm font-normal text-ellipsis whitespace-nowrap ${avatarSrc ? 'text-(--text-color)' : 'text-(--text-gray-color)'}`}
                        >
                            {name}
                        </span>
                    )}
                    {showDetails && email && (
                        <span
                            className={
                                'text-2xs overflow-hidden font-normal text-ellipsis whitespace-nowrap text-(--text-gray-color)'
                            }
                        >
                            {email}
                        </span>
                    )}
                </div>
            )}
        </>
    );

    return (
        <Badge
            className={cn(
                classVariants({ size }),
                'w-fit self-start',
                className,
            )}
            variant={'avatar'}
            tooltip={showTooltip}
            tooltipText={showTooltip ? content(false) : undefined}
        >
            {content(true)}
        </Badge>
    );
};

export default UserBadge;
