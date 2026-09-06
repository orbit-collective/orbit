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
 * short. Matching is by name only (it's just filtering candidates to show),
 * identity of whichever one gets picked is always tracked by id afterwards.
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

/**
 * A mention inserted into a comment being composed, tracked by its exact
 * character range in the textarea's plain-text value rather than by name —
 * this is what lets the compose box show clean "@Full Name" text while still
 * being able to tell apart two project members who happen to share a name.
 */
export interface MentionRange {
    start: number;
    length: number;
    userId: number;
    name: string;
}

/**
 * Re-anchors tracked mention ranges after the textarea's value changes.
 * Diffs the old and new text to find the single edited region (the common
 * prefix/suffix around it): a range entirely before or after that region is
 * kept (shifted by the length delta if it comes after), a range that
 * overlaps the edited region is dropped — its "@Name" text is no longer
 * guaranteed intact, so it can no longer be trusted to mean that user.
 */
export function reconcileMentionRanges(
    ranges: MentionRange[],
    oldText: string,
    newText: string,
): MentionRange[] {
    if (ranges.length === 0) return ranges;

    let prefixLen = 0;
    const maxPrefix = Math.min(oldText.length, newText.length);
    while (prefixLen < maxPrefix && oldText[prefixLen] === newText[prefixLen]) {
        prefixLen++;
    }

    let suffixLen = 0;
    const maxSuffix = maxPrefix - prefixLen;
    while (
        suffixLen < maxSuffix &&
        oldText[oldText.length - 1 - suffixLen] ===
            newText[newText.length - 1 - suffixLen]
    ) {
        suffixLen++;
    }

    const oldChangedEnd = oldText.length - suffixLen;
    const delta = newText.length - oldText.length;

    const survivors: MentionRange[] = [];

    for (const range of ranges) {
        const end = range.start + range.length;

        if (end <= prefixLen) {
            survivors.push(range);
        } else if (range.start >= oldChangedEnd) {
            survivors.push({ ...range, start: range.start + delta });
        }
        // else: the edit overlaps this range - drop it.
    }

    return survivors;
}

/**
 * Rewrites a comment's plain-text body into the persisted form, replacing
 * each tracked mention's plain "@Name" with an "@[Name](id)" token so it can
 * be resolved back to the exact user unambiguously later, regardless of any
 * other project member sharing that same display name. Applied right-to-left
 * so earlier ranges' offsets stay valid while later ones are rewritten.
 */
export function tokenizeMentionRanges(
    body: string,
    ranges: MentionRange[],
): string {
    const sorted = [...ranges].sort((a, b) => b.start - a.start);

    return sorted.reduce((text, range) => {
        const token = `@[${range.name}](${range.userId})`;

        return (
            text.slice(0, range.start) +
            token +
            text.slice(range.start + range.length)
        );
    }, body);
}

const MENTION_TOKEN_PATTERN = /@\[([^\]]+)\]\((\d+)\)/g;

export type MentionSegment =
    | { type: 'text'; value: string }
    | {
          type: 'mention';
          value: string;
          userId: number;
          name: string;
          avatar?: string | null;
      };

/**
 * Splits a persisted comment body into plain-text and mention segments,
 * parsing the "@[Name](id)" token format so each mention resolves back to an
 * exact user id — never ambiguous even when two project members share a
 * display name. The rendered name/avatar are looked up live by id (falling
 * back to the name captured in the token if that member is no longer in the
 * project), so a later rename still shows correctly.
 */
export function splitMentionText(
    body: string,
    users: AssignableUser[] = [],
): MentionSegment[] {
    if (!body) return [{ type: 'text', value: body }];

    const usersById = new Map(users.map((user) => [user.id, user]));
    const segments: MentionSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    MENTION_TOKEN_PATTERN.lastIndex = 0;
    while ((match = MENTION_TOKEN_PATTERN.exec(body)) !== null) {
        const [full, tokenName, tokenId] = match;
        const userId = Number(tokenId);
        const user = usersById.get(userId);

        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                value: body.slice(lastIndex, match.index),
            });
        }

        segments.push({
            type: 'mention',
            value: `@${user?.name ?? tokenName}`,
            userId,
            name: user?.name ?? tokenName,
            avatar: user?.avatar,
        });

        lastIndex = match.index + full.length;
    }

    if (lastIndex < body.length) {
        segments.push({ type: 'text', value: body.slice(lastIndex) });
    }

    if (segments.length === 0) {
        segments.push({ type: 'text', value: body });
    }

    return segments;
}
