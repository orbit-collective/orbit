import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { useCommandPalette } from '@/context/CommandContext';
import { useCommands } from '@/hooks/useCommands';
import { Command, PaletteSearchResults } from '@/types/Commands';
import CommandPalette from './CommandPalette';

const commands: Command[] = [
    {
        id: 'nav.dashboard',
        title: 'Go to Dashboard',
        group: 'navigation',
        icon: 'LayoutDashboard',
        shortcut: 'alt+b',
        perform: () => {},
    },
    {
        id: 'nav.projects',
        title: 'Go to Projects',
        group: 'navigation',
        icon: 'FolderGit2',
        perform: () => {},
    },
    {
        id: 'issue.create',
        title: 'Create issue',
        group: 'creation',
        icon: 'Plus',
        perform: () => {},
    },
    {
        id: 'project.create',
        title: 'Create project',
        group: 'creation',
        icon: 'FolderPlus',
        perform: () => {},
    },
    {
        id: 'prefs.accent',
        title: 'Change accent color',
        subtitle: 'Pick one of the theme accents',
        group: 'preferences',
        icon: 'Palette',
        children: () => [
            {
                id: 'accent.pink',
                title: 'Pink',
                group: 'preferences',
                icon: 'Palette',
                perform: () => {},
            },
            {
                id: 'accent.sky',
                title: 'Sky',
                group: 'preferences',
                icon: 'Palette',
                perform: () => {},
            },
        ],
    },
    {
        id: 'account.logout',
        title: 'Log out',
        group: 'account',
        icon: 'LogOut',
        perform: () => {},
    },
];

const searchResults: PaletteSearchResults = {
    issues: [
        {
            id: 101,
            number: 12,
            title: 'Fix login redirect after session timeout',
            url: '/projects/1/issues/101',
            project: { id: 1, name: 'Orbit' },
            type: { name: 'Bug', icon: 'Bug', color: '#f44336' },
            status: { name: 'Fixing', color: '#8844da' },
        },
    ],
    projects: [
        {
            id: 1,
            name: 'Orbit',
            slug: 'orbit',
            color: 'purple',
            url: '/projects/1',
        },
    ],
    people: [
        {
            id: 2,
            name: 'Marcus Lee',
            avatar: null,
            project: { id: 1, name: 'Orbit' },
            url: '/projects/1/issues?assignee=2',
        },
    ],
};

/** Registers sample commands and opens the palette, which is otherwise toggled with mod+k. */
const OpenPalette = ({
    mode = 'default',
    registered = commands,
}: {
    mode?: 'default' | 'search';
    registered?: Command[];
}) => {
    useCommands(registered);
    const { openPalette } = useCommandPalette();

    useEffect(() => {
        openPalette(mode);
    }, [openPalette, mode]);

    return <CommandPalette />;
};

const meta = {
    title: 'Organisms/CommandPalette',
    component: OpenPalette,
    parameters: {
        layout: 'fullscreen',
        network: [
            {
                url: /command-palette\.search/,
                response: searchResults,
            },
        ],
    },
    decorators: [
        (Story) => (
            <div className="h-[640px] bg-[var(--bg-color)]">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof OpenPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);

/** Matched characters are highlighted in their own element, so compare whole option text. */
const optionNames = () =>
    body()
        .queryAllByRole('option')
        .map((option) => option.textContent ?? '');

export const Default: Story = {
    play: async () => {
        await waitFor(() =>
            expect(body().getAllByRole('option').length).toBeGreaterThan(0),
        );
        await expect(body().getByText('Go to Dashboard')).toBeVisible();
    },
};

export const SearchMode: Story = { args: { mode: 'search' } };

export const FilteringCommands: Story = {
    play: async () => {
        const input = await body().findByRole('combobox');
        await userEvent.type(input, 'create');
        await waitFor(() => {
            const names = optionNames();
            expect(names.some((name) => name.includes('Create issue'))).toBe(
                true,
            );
            expect(names.some((name) => name.includes('Dashboard'))).toBe(
                false,
            );
        });
    },
};

/** Prefix `#` searches issues on the server; results come from the network mock. */
export const SearchingIssues: Story = {
    play: async () => {
        const input = await body().findByRole('combobox');
        await userEvent.type(input, '#login');
        await waitFor(
            () =>
                expect(
                    optionNames().some((name) =>
                        name.includes('Fix login redirect'),
                    ),
                ).toBe(true),
            { timeout: 3000 },
        );
    },
};

export const NestedStep: Story = {
    play: async () => {
        await userEvent.click(await body().findByText('Change accent color'));
        await expect(await body().findByText('Pink')).toBeVisible();
    },
};

export const NoResults: Story = {
    play: async () => {
        const input = await body().findByRole('combobox');
        await userEvent.type(input, 'zzzzqqq');
        await waitFor(() =>
            expect(body().queryAllByRole('option')).toHaveLength(0),
        );
    },
};

export const NoCommands: Story = { args: { registered: [] } };
