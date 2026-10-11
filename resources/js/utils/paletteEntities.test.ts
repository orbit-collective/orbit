import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PaletteSearchIssue } from '@/types/Commands';

const mockVisit = vi.hoisted(() => vi.fn());
vi.mock('@inertiajs/react', () => ({ router: { visit: mockVisit } }));

import { loadHistory } from './commandHistory';
import {
    issueToCommand,
    personToCommand,
    projectToCommand,
} from './paletteEntities';

const issue: PaletteSearchIssue = {
    id: 5,
    number: 12,
    title: 'Fix login redirect',
    url: '/projects/1/issues/5',
    project: { id: 1, name: 'Orbit' },
    type: { name: 'Bug', icon: 'Bug', color: '#ff0000' },
    status: { name: 'In progress', color: '#00ff00' },
};

beforeEach(() => {
    mockVisit.mockClear();
    localStorage.clear();
});

describe('issueToCommand', () => {
    test('maps the payload onto a palette row', () => {
        expect(issueToCommand(issue)).toMatchObject({
            id: 'issue.5',
            title: 'Fix login redirect',
            prefix: '#12',
            subtitle: 'Orbit · In progress',
            group: 'issues',
            icon: 'Bug',
            iconColor: '#ff0000',
        });
    });

    test('can be placed in another group', () => {
        expect(issueToCommand(issue, 'recent').group).toBe('recent');
    });

    test('falls back to a generic icon for an unknown or missing type icon', () => {
        expect(
            issueToCommand({
                ...issue,
                type: { name: 'X', icon: 'NoSuchIcon', color: '#000' },
            }).icon,
        ).toBe('CircleDot');
        expect(issueToCommand({ ...issue, type: null }).icon).toBe('CircleDot');
        expect(
            issueToCommand({ ...issue, type: null }).iconColor,
        ).toBeUndefined();
    });

    test('shows only the project when there is no status', () => {
        expect(issueToCommand({ ...issue, status: null }).subtitle).toBe(
            'Orbit',
        );
    });

    test('running it opens the issue and remembers it', () => {
        issueToCommand(issue).perform?.();

        expect(mockVisit).toHaveBeenCalledWith('/projects/1/issues/5');
        expect(loadHistory()).toEqual([{ type: 'issue', issue }]);
    });
});

describe('projectToCommand', () => {
    const project = {
        id: 3,
        name: 'Login Portal',
        slug: 'login-portal',
        color: 'blue',
        url: '/projects/3',
    };

    test('maps the payload onto a palette row', () => {
        expect(projectToCommand(project)).toMatchObject({
            id: 'project.3',
            title: 'Login Portal',
            subtitle: 'Project',
            group: 'projects',
            icon: 'FolderGit2',
        });
    });

    test('running it opens the project', () => {
        projectToCommand(project).perform?.();

        expect(mockVisit).toHaveBeenCalledWith('/projects/3');
    });
});

describe('personToCommand', () => {
    const person = {
        id: 9,
        name: 'Ann Marlow',
        avatar: null,
        project: { id: 1, name: 'Orbit' },
        url: '/projects/1?assignee=9',
    };

    test('is a "Show issues assigned to" row for one person in one project', () => {
        expect(personToCommand(person)).toMatchObject({
            id: 'person.9.1',
            title: 'Show issues assigned to Ann Marlow',
            subtitle: 'Orbit',
            group: 'people',
        });
    });

    test('the same person in two projects gets two distinct ids', () => {
        expect(
            personToCommand({ ...person, project: { id: 2, name: 'Beta' } }).id,
        ).toBe('person.9.2');
    });

    test('running it opens the project list filtered to the assignee', () => {
        personToCommand(person).perform?.();

        expect(mockVisit).toHaveBeenCalledWith('/projects/1?assignee=9');
    });
});
