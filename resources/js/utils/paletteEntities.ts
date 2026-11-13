import { router } from '@inertiajs/react';
import type { icons } from 'lucide-react';
import {
    Command,
    CommandGroup,
    PaletteSearchIssue,
    PaletteSearchPerson,
    PaletteSearchProject,
} from '@/types/Commands';
import { recordHistory } from '@/utils/commandHistory';
import { isLucideIconName } from '@/utils/lucideIconNames';

const FALLBACK_ISSUE_ICON: keyof typeof icons = 'CircleDot';

const resolveIcon = (name: string | undefined): keyof typeof icons =>
    name && isLucideIconName(name)
        ? (name as keyof typeof icons)
        : FALLBACK_ISSUE_ICON;

/** A server issue as a palette row; running it opens the issue and remembers it. */
export const issueToCommand = (
    issue: PaletteSearchIssue,
    group: CommandGroup = 'issues',
): Command => ({
    id: `issue.${issue.id}`,
    title: issue.title,
    prefix: `#${issue.number}`,
    subtitle: [issue.project.name, issue.status?.name]
        .filter(Boolean)
        .join(' · '),
    group,
    icon: resolveIcon(issue.type?.icon),
    iconColor: issue.type?.color,
    perform: () => {
        recordHistory({ type: 'issue', issue });
        router.visit(issue.url);
    },
});

type Translate = (
    key: string,
    replacements?: Record<string, string | number>,
) => string;

export const projectToCommand = (
    project: PaletteSearchProject,
    t?: Translate,
): Command => ({
    id: `project.${project.id}`,
    title: project.name,
    subtitle: t ? t('util_palette_entities.project') : 'Project',
    group: 'projects',
    icon: 'FolderGit2',
    perform: () => router.visit(project.url),
});

/** A teammate as "Show issues assigned to ...", opening the filtered issue list. */
export const personToCommand = (
    person: PaletteSearchPerson,
    t?: Translate,
): Command => ({
    id: `person.${person.id}.${person.project.id}`,
    title: t
        ? t('util_palette_entities.person', { name: person.name })
        : `Show issues assigned to ${person.name}`,
    subtitle: person.project.name,
    group: 'people',
    icon: 'UserSearch',
    perform: () => router.visit(person.url),
});
