import { icons } from 'lucide-react';
import { ShortcutDefinition, ShortcutScope } from '@/types/Shortcuts';

export type CommandGroup =
    | 'suggested'
    | 'navigation'
    | 'creation'
    | 'preferences'
    | 'account'
    | 'help';

/** On-screen order of the groups when the query is empty. */
export const COMMAND_GROUP_ORDER: CommandGroup[] = [
    'suggested',
    'navigation',
    'creation',
    'preferences',
    'account',
    'help',
];

export const COMMAND_GROUP_LABELS: Record<CommandGroup, string> = {
    suggested: 'Suggested',
    navigation: 'Navigation',
    creation: 'Creation',
    preferences: 'Preferences',
    account: 'Account',
    help: 'Help',
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
    /** Extra words the fuzzy search matches against (never highlighted). */
    keywords?: string[];
    /** Registered with the shortcut engine while the command is registered. */
    shortcut?: string | string[];
    /** Category the shortcut gets in the help view; defaults from `group`. */
    category?: ShortcutDefinition['category'];
    scope?: ShortcutScope;
    /** Hide the command (and its shortcut) when this returns false. */
    when?: () => boolean;
    perform?: () => void;
    /** Opens a nested step instead of performing: the palette pushes a page. */
    children?: () => Command[];
}

export interface PalettePage {
    id: string;
    title: string;
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
