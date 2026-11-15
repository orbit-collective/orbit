import axios from 'axios';
import { cva } from 'class-variance-authority';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import UserPreviewCard from '@/Components/Molecules/UserPreviewCard/UserPreviewCard';
import { AvatarProps } from '@/types/Components';
import { UserPreview } from '@/types/Users';

// Hovering the same avatar repeatedly shouldn't refetch every time, but the
// entry expires so a changed list of recent issues doesn't stay stale.
const PREVIEW_TTL_MS = 30_000;
const previewCache = new Map<
    number,
    { data: UserPreview; fetchedAt: number }
>();

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

const Avatar: React.FC<AvatarProps> = ({
    src,
    alt,
    size = 'md',
    initials,
    userId,
}) => {
    const { t } = useLaravelReactI18n();
    const [preview, setPreview] = useState<{
        user: UserPreview;
        rect: DOMRect;
    } | null>(null);
    const hoveredRef = useRef(false);

    const show = async (element: HTMLElement) => {
        if (userId === undefined) return;

        hoveredRef.current = true;
        const rect = element.getBoundingClientRect();
        const cached = previewCache.get(userId);
        let data =
            cached && Date.now() - cached.fetchedAt < PREVIEW_TTL_MS
                ? cached.data
                : undefined;

        if (!data) {
            try {
                ({ data } = await axios.get<UserPreview>(
                    route('users.preview', userId),
                ));
                previewCache.set(userId, { data, fetchedAt: Date.now() });
            } catch {
                return;
            }
        }

        if (hoveredRef.current) setPreview({ user: data, rect });
    };

    const hide = () => {
        hoveredRef.current = false;
        setPreview(null);
    };

    return (
        <>
            <div
                className={classVariants({ size })}
                onMouseEnter={(e) => void show(e.currentTarget)}
                onMouseLeave={hide}
            >
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
            {preview &&
                createPortal(
                    <UserPreviewCard
                        user={preview.user}
                        anchorRect={preview.rect}
                    />,
                    document.body,
                )}
        </>
    );
};

export default Avatar;
