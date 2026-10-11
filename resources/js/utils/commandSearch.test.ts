import { describe, expect, test } from 'vitest';
import { Command } from '@/types/Commands';
import { flattenSections, scoreCommand, searchCommands } from './commandSearch';

const cmd = (overrides: Partial<Command> & Pick<Command, 'id'>): Command => ({
    title: overrides.id,
    group: 'navigation',
    icon: 'Search',
    ...overrides,
});

const COMMANDS: Command[] = [
    cmd({ id: 'nav.dashboard', title: 'Dashboard', group: 'navigation' }),
    cmd({
        id: 'nav.projects',
        title: 'Projects',
        group: 'navigation',
        keywords: ['repositories'],
    }),
    cmd({
        id: 'issue.create',
        title: 'Create issue',
        group: 'creation',
        subtitle: 'In the current project',
    }),
    cmd({ id: 'project.create', title: 'Create project', group: 'creation' }),
    cmd({ id: 'theme.dark', title: 'Dark theme', group: 'preferences' }),
    cmd({ id: 'issue.status', title: 'Change status', group: 'suggested' }),
];

describe('scoreCommand', () => {
    test('an empty query keeps the command with score 0', () => {
        expect(scoreCommand(COMMANDS[0], '')).toEqual({
            command: COMMANDS[0],
            score: 0,
            ranges: [],
        });
    });

    test('returns null when nothing matches', () => {
        expect(scoreCommand(COMMANDS[0], 'zzz')).toBeNull();
    });

    test('matches keywords without highlighting the title', () => {
        const scored = scoreCommand(COMMANDS[1], 'repos');

        expect(scored).not.toBeNull();
        expect(scored?.ranges).toEqual([]);
    });

    test('matches the subtitle with a lower weight than the title', () => {
        const viaSubtitle = scoreCommand(COMMANDS[2], 'current');
        const viaTitle = scoreCommand(COMMANDS[2], 'create');

        expect(viaSubtitle).not.toBeNull();
        expect(viaTitle?.score).toBeGreaterThan(viaSubtitle?.score ?? 0);
    });
});

describe('searchCommands', () => {
    test('with an empty query groups in the fixed order', () => {
        const sections = searchCommands(COMMANDS, '');

        expect(sections.map((s) => s.group)).toEqual([
            'suggested',
            'navigation',
            'creation',
            'preferences',
        ]);
        expect(sections.map((s) => s.label)).toEqual([
            'Suggested',
            'Navigation',
            'Creation',
            'Preferences',
        ]);
        expect(sections[1].items.map((i) => i.command.id)).toEqual([
            'nav.dashboard',
            'nav.projects',
        ]);
    });

    test('"crt iss" ranks "Create issue" first on screen', () => {
        const flat = flattenSections(searchCommands(COMMANDS, 'crt iss'));

        expect(flat[0].command.id).toBe('issue.create');
        expect(flat[0].ranges.length).toBeGreaterThan(0);
    });

    test('with a query, groups are ordered by their best item', () => {
        const sections = searchCommands(COMMANDS, 'dark');

        expect(sections).toHaveLength(1);
        expect(sections[0].group).toBe('preferences');
    });

    test('drops groups with no matches and returns [] for no results', () => {
        expect(searchCommands(COMMANDS, 'zzzz')).toEqual([]);
    });

    test('flattenSections follows on-screen order', () => {
        const sections = searchCommands(COMMANDS, '');

        expect(flattenSections(sections).map((i) => i.command.id)).toEqual([
            'issue.status',
            'nav.dashboard',
            'nav.projects',
            'issue.create',
            'project.create',
            'theme.dark',
        ]);
    });
});
