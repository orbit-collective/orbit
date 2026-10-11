/** Half-open `[start, end)` character ranges of `text` that matched. */
export type MatchRange = [number, number];

export interface FuzzyMatch {
    score: number;
    ranges: MatchRange[];
}

const isWordChar = (char: string | undefined): boolean =>
    char !== undefined && /[\p{L}\p{N}]/u.test(char);

const isWordStart = (text: string, index: number): boolean =>
    index === 0 || !isWordChar(text[index - 1]);

const SCORE_WORD_PREFIX = 300;
const SCORE_CONTIGUOUS = 200;
const SCORE_SCATTERED = 100;

const mergeRanges = (ranges: MatchRange[]): MatchRange[] => {
    const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
    const merged: MatchRange[] = [];

    sorted.forEach(([start, end]) => {
        const last = merged[merged.length - 1];
        if (last && start <= last[1]) {
            last[1] = Math.max(last[1], end);
        } else {
            merged.push([start, end]);
        }
    });

    return merged;
};

const matchScattered = (
    token: string,
    lower: string,
): { score: number; ranges: MatchRange[] } | null => {
    let best: { score: number; ranges: MatchRange[] } | null = null;

    for (let start = lower.indexOf(token[0]); start !== -1;) {
        const indexes = [start];
        let cursor = start;
        let failed = false;

        for (let i = 1; i < token.length; i++) {
            cursor = lower.indexOf(token[i], cursor + 1);
            if (cursor === -1) {
                failed = true;
                break;
            }
            indexes.push(cursor);
        }

        if (failed) break;

        const span = indexes[indexes.length - 1] - start + 1;
        const score =
            SCORE_SCATTERED -
            (span - token.length) +
            (isWordStart(lower, start) ? 10 : 0);

        if (!best || score > best.score) {
            best = {
                score,
                ranges: indexes.map((index): MatchRange => [index, index + 1]),
            };
        }

        start = lower.indexOf(token[0], start + 1);
    }

    return best;
};

const matchToken = (
    token: string,
    lower: string,
): { score: number; ranges: MatchRange[] } | null => {
    for (let at = lower.indexOf(token); at !== -1;) {
        if (isWordStart(lower, at)) {
            return {
                score: SCORE_WORD_PREFIX - at + (at === 0 ? 50 : 0),
                ranges: [[at, at + token.length]],
            };
        }
        at = lower.indexOf(token, at + 1);
    }

    const contiguous = lower.indexOf(token);
    if (contiguous !== -1) {
        return {
            score: SCORE_CONTIGUOUS - contiguous * 0.5,
            ranges: [[contiguous, contiguous + token.length]],
        };
    }

    return matchScattered(token, lower);
};

/**
 * Fuzzy-matches every whitespace-separated token of `query` against `text`.
 * A token scores best as a word prefix, then as a contiguous substring, then
 * as scattered characters ("crt" → "Create"). Returns `null` when any token
 * fails, otherwise the total score and the ranges to highlight.
 */
export const fuzzyScore = (query: string, text: string): FuzzyMatch | null => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return { score: 0, ranges: [] };

    const lower = text.toLowerCase();
    let score = 0;
    const ranges: MatchRange[] = [];

    for (const token of tokens) {
        const match = matchToken(token, lower);
        if (!match) return null;
        score += match.score;
        ranges.push(...match.ranges);
    }

    // Prefer the shorter title when two matches are otherwise equal.
    return { score: score - text.length * 0.1, ranges: mergeRanges(ranges) };
};
