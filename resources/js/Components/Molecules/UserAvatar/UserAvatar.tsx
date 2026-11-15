import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import UserPreviewCard from '@/Components/Molecules/UserPreviewCard/UserPreviewCard';
import { UserAvatarProps } from '@/types/Components';
import { UserPreview } from '@/types/Users';

// Hovering the same avatar repeatedly shouldn't refetch every time, but the
// entry expires so a changed list of recent issues doesn't stay stale.
const PREVIEW_TTL_MS = 30_000;
const previewCache = new Map<
    number,
    { data: UserPreview; fetchedAt: number }
>();

const FOCUSABLE_HOST = 'a[href], button, [tabindex]:not([tabindex="-1"])';

/**
 * An avatar that opens the user's preview card on hover, and on keyboard
 * focus of the control it sits in (a row button or link). It adds no tab stop
 * of its own, so it never nests an interactive element inside another one.
 * Without a `userId` it is just the plain avatar.
 */
const UserAvatar: React.FC<UserAvatarProps> = ({ userId, ...avatarProps }) => {
    const wrapperRef = useRef<HTMLSpanElement>(null);
    // Identifies the latest show/hide, so a response that arrives after the
    // pointer left, or after the avatar switched to another user, is dropped.
    const requestRef = useRef(0);
    const [preview, setPreview] = useState<{
        user: UserPreview;
        rect: DOMRect;
    } | null>(null);

    const show = async () => {
        if (userId === undefined || !wrapperRef.current) return;

        const requestId = ++requestRef.current;
        const rect = wrapperRef.current.getBoundingClientRect();
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

        if (requestId === requestRef.current) setPreview({ user: data, rect });
    };

    const hide = () => {
        requestRef.current++;
        setPreview(null);
    };

    // A different user in the same slot (e.g. a reassigned issue) must not
    // keep the previous person's card or a pending request alive.
    useEffect(() => {
        requestRef.current++;
        setPreview(null);
    }, [userId]);

    // Keyboard: open while the surrounding control has focus.
    useEffect(() => {
        const host = wrapperRef.current?.closest(FOCUSABLE_HOST);

        if (userId === undefined || !host) return;

        const onFocus = () => void show();
        host.addEventListener('focusin', onFocus);
        host.addEventListener('focusout', hide);

        return () => {
            host.removeEventListener('focusin', onFocus);
            host.removeEventListener('focusout', hide);
        };
        // show/hide only read refs and userId.
    }, [userId]);

    useEffect(() => {
        if (!preview) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') hide();
        };
        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [preview]);

    if (userId === undefined) return <Avatar {...avatarProps} />;

    return (
        <>
            <span
                ref={wrapperRef}
                className="inline-flex shrink-0"
                onMouseEnter={() => void show()}
                onMouseLeave={hide}
            >
                <Avatar {...avatarProps} />
            </span>
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

export default UserAvatar;
