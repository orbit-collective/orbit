import {
    Command,
    COMMAND_GROUP_LABELS,
    COMMAND_GROUP_ORDER,
    CommandGroup,
} from '@/types/Commands';
import { fuzzyScore, MatchRange } from '@/utils/fuzzyScore';

export interface ScoredCommand {
    command: Command;
    score: number;
    /** Highlight ranges within `command.title`. */
    ranges: MatchRange[];
}

export interface CommandSection {
    group: CommandGroup;
    label: string;
    items: ScoredCommand[];
}

const KEYWORD_WEIGHT = 0.6;
const SUBTITLE_WEIGHT = 0.4;

/** Scores one command: the title counts fully, keywords and subtitle less. */
export const scoreCommand = (
    command: Command,
    query: string,
): ScoredCommand | null => {
    if (!query.trim()) return { command, score: 0, ranges: [] };

    const title = fuzzyScore(query, command.title);
    const candidates: ScoredCommand[] = [];

    if (title) {
        candidates.push({ command, score: title.score, ranges: title.ranges });
    }

    (command.keywords ?? []).forEach((keyword) => {
        const match = fuzzyScore(query, keyword);
        if (match) {
            candidates.push({
                command,
                score: match.score * KEYWORD_WEIGHT,
                ranges: [],
            });
        }
    });

    if (command.subtitle) {
        const match = fuzzyScore(query, command.subtitle);
        if (match) {
            candidates.push({
                command,
                score: match.score * SUBTITLE_WEIGHT,
                ranges: [],
            });
        }
    }

    if (candidates.length === 0) return null;
    return candidates.reduce((best, c) => (c.score > best.score ? c : best));
};

/**
 * Filters and groups commands for display. With an empty query the groups
 * follow the fixed `COMMAND_GROUP_ORDER` and items keep registration order.
 * With a query, items are ranked by score and groups ordered by their best
 * item, so the strongest match is always the first row on screen.
 */
export const searchCommands = (
    commands: Command[],
    query: string,
): CommandSection[] => {
    const hasQuery = query.trim().length > 0;
    const buckets = new Map<CommandGroup, ScoredCommand[]>();

    commands.forEach((command) => {
        const scored = scoreCommand(command, query);
        if (!scored) return;
        const bucket = buckets.get(command.group) ?? [];
        bucket.push(scored);
        buckets.set(command.group, bucket);
    });

    const sections: CommandSection[] = COMMAND_GROUP_ORDER.filter((group) =>
        buckets.has(group),
    ).map((group) => {
        const items = buckets.get(group) as ScoredCommand[];
        return {
            group,
            label: COMMAND_GROUP_LABELS[group],
            items: hasQuery
                ? [...items].sort((a, b) => b.score - a.score)
                : items,
        };
    });

    if (hasQuery) {
        sections.sort((a, b) => b.items[0].score - a.items[0].score);
    }

    return sections;
};

/** Sections flattened into the order rows appear on screen. */
export const flattenSections = (sections: CommandSection[]): ScoredCommand[] =>
    sections.flatMap((section) => section.items);
