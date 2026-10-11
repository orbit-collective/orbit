/** `>` = commands only, `#` = issues only, anything else = everything. */
export type PaletteScope = 'all' | 'commands' | 'issues';

export interface ParsedPaletteQuery {
    scope: PaletteScope;
    /** What the local fuzzy search matches against (prefix removed). */
    text: string;
    /**
     * What to send to the server, or `null` when nothing should be sent: the
     * scope is commands-only, or the text is below the minimum length (1 digit
     * after `#`, otherwise 2 characters).
     */
    serverQuery: string | null;
}

export const MIN_TEXT_LENGTH = 2;
export const MAX_QUERY_LENGTH = 100;

export const parsePaletteQuery = (raw: string): ParsedPaletteQuery => {
    if (raw.startsWith('>')) {
        return {
            scope: 'commands',
            text: raw.slice(1).trim(),
            serverQuery: null,
        };
    }

    if (raw.startsWith('#')) {
        const rest = raw.slice(1).trim();
        const minimum = /^\d+$/.test(rest) ? 1 : MIN_TEXT_LENGTH;

        return {
            scope: 'issues',
            text: rest,
            serverQuery:
                rest.length >= minimum
                    ? `#${rest}`.slice(0, MAX_QUERY_LENGTH)
                    : null,
        };
    }

    const text = raw.trim();

    return {
        scope: 'all',
        text,
        serverQuery:
            text.length >= MIN_TEXT_LENGTH
                ? text.slice(0, MAX_QUERY_LENGTH)
                : null,
    };
};
