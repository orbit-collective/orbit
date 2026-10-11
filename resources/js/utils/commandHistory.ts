import { PaletteSearchIssue } from '@/types/Commands';

const STORAGE_KEY = 'orbit.command-palette.history';

export const HISTORY_LIMIT = 8;

export type HistoryEntry =
    | { type: 'command'; id: string }
    | { type: 'issue'; issue: PaletteSearchIssue };

const entryKey = (entry: HistoryEntry): string =>
    entry.type === 'command'
        ? `command:${entry.id}`
        : `issue:${entry.issue.id}`;

const isEntry = (value: unknown): value is HistoryEntry => {
    if (typeof value !== 'object' || value === null) return false;
    const entry = value as Record<string, unknown>;

    if (entry.type === 'command') return typeof entry.id === 'string';
    if (entry.type === 'issue') {
        const issue = entry.issue as Record<string, unknown> | undefined;
        return (
            typeof issue === 'object' &&
            issue !== null &&
            typeof issue.id === 'number' &&
            typeof issue.title === 'string' &&
            typeof issue.url === 'string'
        );
    }
    return false;
};

/** Most recent first. Never throws: storage can be blocked or hold garbage. */
export const loadHistory = (): HistoryEntry[] => {
    try {
        const parsed: unknown = JSON.parse(
            localStorage.getItem(STORAGE_KEY) ?? '[]',
        );
        return Array.isArray(parsed)
            ? parsed.filter(isEntry).slice(0, HISTORY_LIMIT)
            : [];
    } catch {
        return [];
    }
};

/** Moves the entry to the front, de-duplicated, capped at `HISTORY_LIMIT`. */
export const recordHistory = (entry: HistoryEntry): void => {
    try {
        const key = entryKey(entry);
        const next = [
            entry,
            ...loadHistory().filter((existing) => entryKey(existing) !== key),
        ].slice(0, HISTORY_LIMIT);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // History is a convenience; losing it must never break the palette.
    }
};
