import { icons } from 'lucide-react';
import { ShortcutDefinition, ShortcutScope } from '@/types/Shortcuts';

export type CommandGroup =
    | 'suggested'
    | 'recent'
    | 'navigation'
    | 'creation'
    | 'preferences'
    | 'account'
    | 'help'
    | 'issues'
    | 'projects'
    | 'people';

/** On-screen order of the groups when the query is empty. */
export const COMMAND_GROUP_ORDER: CommandGroup[] = [
    'suggested',
    'recent',
    'navigation',
    'creation',
    'preferences',
    'account',
    'help',
    'issues',
    'projects',
    'people',
];

export const COMMAND_GROUP_LABELS: Record<CommandGroup, string> = {
    suggested: 'Suggested',
    recent: 'Recent',
    navigation: 'Navigation',
    creation: 'Creation',
    preferences: 'Preferences',
    account: 'Account',
    help: 'Help',
    issues: 'Issues',
    projects: 'Projects',
    people: 'People',
};

export type PaletteMode = 'default' | 'search';

/**
 * A command is not a shortcut: every action the palette can run is a
 * command, and a keybinding is just an optional attribute of it.
 */
export interface Command {
    /** Stable id, e.g. `project.create` — also what `runCommand(id)` takes. */
    id: string;
    title: string;
    subtitle?: string;
    group: CommandGroup;
    icon: keyof typeof icons;
    /** CSS color for the icon (e.g. an issue type's color); defaults to muted. */
    iconColor?: string;
    /** Muted text before the title, e.g. an issue's `#12`. */
    prefix?: string;
    /** Extra words the fuzzy search matches against (never highlighted). */
    keywords?: string[];
    /** Registered with the shortcut engine while the command is registered. */
    shortcut?: string | string[];
    /** Category the shortcut gets in the help view; defaults from `group`. */
    category?: ShortcutDefinition['category'];
    scope?: ShortcutScope;
    /** Shown first in the breadcrumb of the step this command opens, e.g. `#12`. */
    context?: string;
    /** Run without closing the palette (multi-select steps such as labels). */
    keepOpen?: boolean;
    /** Hide the command (and its shortcut) when this returns false. */
    when?: () => boolean;
    perform?: () => void;
    /** Opens a nested step instead of performing: the palette pushes a page. */
    children?: () => Command[];
}

export interface PalettePage {
    /** The id of the command that opened the step, so its list can be re-read. */
    id: string;
    title: string;
    context?: string;
    commands: Command[];
}

export interface CommandContextType {
    /** Every registered command (latest registration wins per id). */
    commands: Command[];
    register: (commands: Command[]) => () => void;
    isOpen: boolean;
    mode: PaletteMode;
    /** Nested steps currently on top of the root list; empty at the root. */
    pages: PalettePage[];
    openPalette: (mode?: PaletteMode) => void;
    closePalette: () => void;
    togglePalette: () => void;
    /** Runs a registered command by id, or a command object from a nested page. */
    runCommand: (command: string | Command) => void;
    pushPage: (page: PalettePage) => void;
    popPage: () => void;
}

/** One issue returned by `GET /command-palette/search`. */
export interface PaletteSearchIssue {
    id: number;
    /** The project-scoped number users see as `#12`. */
    number: number;
    title: string;
    url: string;
    project: { id: number; name: string };
    type: { name: string; icon: string; color: string } | null;
    status: { name: string; color: string | null } | null;
}

/** One project returned by `GET /command-palette/search`. */
export interface PaletteSearchProject {
    id: number;
    name: string;
    slug: string;
    color: string;
    url: string;
}

/** A member of one of the user's projects, with a project they share. */
export interface PaletteSearchPerson {
    id: number;
    name: string;
    avatar: string | null;
    project: { id: number; name: string };
    /** The project's issue list filtered to this assignee. */
    url: string;
}

export interface PaletteSearchResults {
    issues: PaletteSearchIssue[];
    projects: PaletteSearchProject[];
    people: PaletteSearchPerson[];
}

export type PaletteSearchStatus = 'idle' | 'loading' | 'success' | 'error';
