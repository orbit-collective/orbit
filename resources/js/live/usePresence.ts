import { useEffect, useMemo, useRef, useState } from 'react';
import { PresenceUser } from '@/types/Live';
import { getEcho } from './echo';
import { useLiveConnection } from './useLiveConnection';

interface WhisperEvents {
    [event: string]: Record<string, unknown>;
}

interface PresenceChannelApi {
    here(cb: (users: PresenceUser[]) => void): PresenceChannelApi;
    joining(cb: (user: PresenceUser) => void): PresenceChannelApi;
    leaving(cb: (user: PresenceUser) => void): PresenceChannelApi;
    whisper(event: string, data: Record<string, unknown>): PresenceChannelApi;
    listenForWhisper(
        event: string,
        cb: (data: Record<string, unknown>) => void,
    ): PresenceChannelApi;
}

/**
 * Who else has this page open. Joins `presence-<channel>` while mounted and
 * returns the other people (never the current user, however many tabs they
 * have) plus `whisper`, a client-to-client message to the others - used for
 * "is editing" hints, which never touch the server.
 */
export function usePresence(
    channel: string | null,
    currentUserId: number,
    onWhisper?: (event: string, data: Record<string, unknown>) => void,
) {
    const connection = useLiveConnection();
    const [members, setMembers] = useState<PresenceUser[]>([]);
    const channelRef = useRef<PresenceChannelApi | null>(null);
    const whisperHandler = useRef(onWhisper);
    whisperHandler.current = onWhisper;

    useEffect(() => {
        if (!connection || !channel) return;

        const echo = getEcho(connection);
        const presence = echo.join(channel) as unknown as PresenceChannelApi;
        channelRef.current = presence;
        let active = true;

        presence
            .here((users) => active && setMembers(users))
            .joining(
                (user) =>
                    active &&
                    setMembers((current) =>
                        current.some((member) => member.id === user.id)
                            ? current
                            : [...current, user],
                    ),
            )
            .leaving(
                (user) =>
                    active &&
                    setMembers((current) =>
                        current.filter((member) => member.id !== user.id),
                    ),
            );

        for (const event of ['editing', 'stopped-editing']) {
            presence.listenForWhisper(
                event,
                (data) => active && whisperHandler.current?.(event, data),
            );
        }

        return () => {
            active = false;
            channelRef.current = null;
            setMembers([]);
            echo.leave(channel);
        };
    }, [connection?.key, connection?.host, connection?.port, channel]);

    const others = useMemo(
        () => members.filter((member) => member.id !== currentUserId),
        [members, currentUserId],
    );

    const whisper = useRef((event: string, data: WhisperEvents[string]) => {
        channelRef.current?.whisper(event, data);
    }).current;

    return { others, whisper };
}
