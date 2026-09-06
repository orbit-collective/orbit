import { AssignableUser } from '@/types/Users';

export interface ActiveMention {
    query: string;
    start: number;
}

/**
 * Looks backward from the cursor for an in-progress "@mention": an "@"
 * preceded by start-of-text or whitespace, followed by up to two
 * space-separated words (enough to filter by first or first+last name) with
 * no line break in between. Returns the partial name typed so far and the
 * index of the "@" itself, or null if the cursor isn't inside a mention.
 */
export function findActiveMention(
    text: string,
    cursor: number,
): ActiveMention | null {
    const upToCursor = text.slice(0, cursor);
    const match = upToCursor.match(/(?:^|\s)@([^\s@\n]*(?:\s[^\s@\n]+)?)$/);

    if (!match) return null;

    const query = match[1];

    return { query, start: cursor - query.length - 1 };
}

/**
 * Ranks project members by how well their name matches the in-progress
 * mention query, limited to a handful of results so the floating menu stays
 * short.
 */
export function filterUsersByMention(
    users: AssignableUser[],
    query: string,
): AssignableUser[] {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return users.slice(0, 5);

    return users
        .filter((user) => user.name.toLowerCase().includes(normalized))
        .slice(0, 5);
}

const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface MentionSegment {
    type: 'text' | 'mention';
    value: string;
}

/**
 * Splits a comment body into plain-text and mention segments, matching only
 * "@Full Name" occurrences whose name belongs to a real project member —
 * anything else starting with "@" is left as plain text. Longer names are
 * matched first so "@Jane Cooper" isn't mistaken for a shorter "@Jane".
 */
export function splitMentionText(
    body: string,
    users: AssignableUser[],
): MentionSegment[] {
    if (!body || users.length === 0) {
        return [{ type: 'text', value: body }];
    }

    const names = [...new Set(users.map((user) => user.name))]
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);

    if (names.length === 0) {
        return [{ type: 'text', value: body }];
    }

    const pattern = new RegExp(
        `@(?:${names.map(escapeRegExp).join('|')})(?!\\w)`,
        'g',
    );

    const segments: MentionSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(body)) !== null) {
        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                value: body.slice(lastIndex, match.index),
            });
        }
        segments.push({ type: 'mention', value: match[0] });
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < body.length) {
        segments.push({ type: 'text', value: body.slice(lastIndex) });
    }

    return segments;
}
