import { INTEGRATIONS } from '@/types/Integrations';
import { IssueType } from '@/types/IssueTypes';
import { ProjectLabel } from '@/types/Labels';
import { ImportIntegrationSettings } from '@/types/ProjectIntegrations';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsImportPanel from './WorkspaceSettingsImportPanel';

const jira = INTEGRATIONS.find((d) => d.id === 'jira')!;

const issueTypes: IssueType[] = [
    {
        id: 1,
        name: 'Bug',
        icon: 'Bug',
        color: '#ef4444',
        description: null,
        isSystem: true,
        allowsChildren: false,
        isTopLevel: true,
        requiredFields: [],
        restrictedRoleTypes: [],
        statuses: [
            {
                id: 1,
                issueTypeId: 1,
                name: 'Reported',
                color: '#94a3b8',
                category: 'todo',
                isInitial: true,
            },
            {
                id: 2,
                issueTypeId: 1,
                name: 'Fixed',
                color: '#22c55e',
                category: 'done',
                isInitial: false,
            },
        ],
    },
    {
        id: 2,
        name: 'Epic',
        icon: 'Zap',
        color: '#a855f7',
        description: null,
        isSystem: true,
        allowsChildren: true,
        isTopLevel: true,
        requiredFields: [],
        restrictedRoleTypes: [],
        statuses: [
            {
                id: 3,
                issueTypeId: 2,
                name: 'Planned',
                color: '#94a3b8',
                category: 'todo',
                isInitial: true,
            },
        ],
    },
];

const labels: ProjectLabel[] = [
    { id: 1, name: 'bug', color: '#f44336', description: null, isSystem: true },
    {
        id: 2,
        name: 'chore',
        color: '#e91e63',
        description: null,
        isSystem: true,
    },
];

const settings: ImportIntegrationSettings = {
    hasCredentials: true,
    instanceUrl: 'https://example.atlassian.net',
    mappingMetadata: {
        statuses: [{ value: 'Code Review', label: 'Code Review' }],
        priorities: [{ value: 'Highest', label: 'Highest' }],
        issueTypes: [{ value: 'Sub-task', label: 'Sub-task' }],
        labels: [{ value: 'regression', label: 'regression' }],
    },
    fieldMappings: [],
    lastImport: null,
};

const onSaveMappings = vi.fn();

const renderPanel = (
    props: Partial<Parameters<typeof WorkspaceSettingsImportPanel>[0]> = {},
) =>
    render(
        <WorkspaceSettingsImportPanel
            integration={jira}
            canUpdate
            settings={settings}
            issueTypes={issueTypes}
            labels={labels}
            onConnect={vi.fn()}
            onSaveMappings={onSaveMappings}
            onImport={vi.fn()}
            {...props}
        />,
    );

describe('WorkspaceSettingsImportPanel', () => {
    beforeEach(() => vi.clearAllMocks());

    test('offers an issue type mapping section', () => {
        renderPanel();

        expect(screen.getByText('Issue types')).toBeInTheDocument();
        expect(screen.getByText('Sub-task')).toBeInTheDocument();
    });

    test("the issue type targets are the project's own types", () => {
        renderPanel();

        fireEvent.click(screen.getByLabelText('Map to Orbit issue types'));

        expect(screen.getAllByText('Bug').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Epic').length).toBeGreaterThan(0);
    });

    test('the status targets are the workflow statuses the project defines', () => {
        renderPanel();

        fireEvent.click(screen.getByLabelText('Map to Orbit statuses'));

        expect(screen.getByText('Reported')).toBeInTheDocument();
        expect(screen.getByText('Fixed')).toBeInTheDocument();
        expect(screen.getByText('Planned')).toBeInTheDocument();
    });

    test("the label targets are the project's own labels", () => {
        renderPanel();

        fireEvent.click(screen.getByLabelText('Map to Orbit labels'));

        expect(screen.getAllByText('chore').length).toBeGreaterThan(0);
    });

    test('saving sends the chosen issue type mapping', () => {
        renderPanel();

        fireEvent.click(screen.getByLabelText('Map to Orbit issue types'));
        const options = screen.getAllByText('Bug');
        fireEvent.click(options[options.length - 1]);

        fireEvent.click(screen.getByText('Save mapping'));

        expect(onSaveMappings).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    mapping_type: 'issue_type',
                    external_value: 'Sub-task',
                    orbit_value: 'Bug',
                }),
            ]),
        );
    });

    test('a project with no types offers no issue type targets', () => {
        renderPanel({ issueTypes: [] });

        fireEvent.click(screen.getByLabelText('Map to Orbit issue types'));

        expect(
            within(document.body).queryByText('No matches found'),
        ).not.toBeNull();
    });
});
