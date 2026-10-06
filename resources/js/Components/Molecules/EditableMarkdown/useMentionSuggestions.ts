import { IssueSuggestion } from '@/types/Components';
import { AssignableUser } from '@/types/Users';
import { filterUsersByMention } from '@/utils/mentions';
import { MentionAttrs, sanitizeMentionLabel } from '@/utils/tiptapMentions';
import {
    SuggestionKeyDownProps,
    SuggestionOptions,
    SuggestionProps,
} from '@tiptap/suggestion';
import axios from 'axios';
import { useRef, useState } from 'react';

type Item = AssignableUser | IssueSuggestion;
type Suggestion = Partial<SuggestionOptions<Item, MentionAttrs>>;

export interface MentionMenu {
    kind: 'user' | 'issue';
    users: AssignableUser[];
    issues: IssueSuggestion[];
    activeIndex: number;
    /** `top` is just below the typed trigger, `lineTop` just above it. */
    position: { top: number; lineTop: number; left: number };
    emptyLabel: string;
    /** Inserts the item at `index` in place of the typed "@query" / "#query". */
    select: (index: number) => void;
}

interface Options {
    users?: AssignableUser[];
    projectId?: number;
}

/**
 * Drives the "@"/"#" suggestion menus of the description editor. Tiptap's
 * suggestion plugin owns the trigger detection; this bridges its lifecycle
 * (start / update / keydown / exit) to React state so the same
 * MentionSuggestions list the comment box uses can be shown.
 *
 * The returned `userSuggestion` / `issueSuggestion` are handed to the
 * mention nodes once, when the editor is created, so everything they read
 * goes through refs to stay current.
 */
export function useMentionSuggestions({ users, projectId }: Options) {
    const [menu, setMenu] = useState<MentionMenu | null>(null);
    const menuRef = useRef<MentionMenu | null>(null);
    const usersRef = useRef(users ?? []);
    usersRef.current = users ?? [];
    const projectIdRef = useRef(projectId);
    projectIdRef.current = projectId;
    // Out-of-order lookups must not overwrite a newer answer.
    const issueRequestRef = useRef(0);
    const lastIssuesRef = useRef<IssueSuggestion[]>([]);

    const update = (next: MentionMenu | null) => {
        menuRef.current = next;
        setMenu(next);
    };

    const showMenu = (
        kind: 'user' | 'issue',
        props: SuggestionProps<Item, MentionAttrs>,
    ) => {
        const rect = props.clientRect?.();

        if (!rect) return update(null);

        const items = props.items;

        update({
            kind,
            users: kind === 'user' ? (items as AssignableUser[]) : [],
            issues: kind === 'issue' ? (items as IssueSuggestion[]) : [],
            activeIndex: 0,
            position: {
                top: rect.bottom + 4,
                lineTop: rect.top - 4,
                left: rect.left,
            },
            emptyLabel:
                kind === 'user'
                    ? 'No members found'
                    : props.query === ''
                      ? 'Type an issue number'
                      : 'No issues found',
            select: (index) => {
                const item = items[index];

                if (!item) return;

                props.command(
                    kind === 'user'
                        ? {
                              id: (item as AssignableUser).id,
                              label: (item as AssignableUser).name,
                          }
                        : {
                              id: (item as IssueSuggestion).id,
                              label: sanitizeMentionLabel(
                                  (item as IssueSuggestion).title,
                                  `#${(item as IssueSuggestion).number ?? (item as IssueSuggestion).id}`,
                              ),
                              number: (item as IssueSuggestion).number ?? null,
                          },
                );
            },
        });
    };

    const handleKeyDown = ({ event }: SuggestionKeyDownProps) => {
        const current = menuRef.current;
        const count = current
            ? current.kind === 'user'
                ? current.users.length
                : current.issues.length
            : 0;

        if (!current) return false;

        if (event.key === 'Escape') {
            // Closing the menu must not also cancel the description edit.
            event.stopPropagation();
            update(null);

            return true;
        }

        if (count === 0) return false;

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            const step = event.key === 'ArrowDown' ? 1 : -1;

            update({
                ...current,
                activeIndex: (current.activeIndex + step + count) % count,
            });

            return true;
        }

        if (event.key === 'Enter' || event.key === 'Tab') {
            current.select(current.activeIndex);

            return true;
        }

        return false;
    };

    const render = (kind: 'user' | 'issue') => () => ({
        onStart: (props: SuggestionProps<Item, MentionAttrs>) =>
            showMenu(kind, props),
        onUpdate: (props: SuggestionProps<Item, MentionAttrs>) =>
            showMenu(kind, props),
        onKeyDown: handleKeyDown,
        onExit: () => update(null),
    });

    // The node type is fixed per suggestion rather than inferred from the
    // attributes, so an issue can never be stored as a "@[Title](id)" user
    // token (which would notify the user whose id equals the issue's).
    const insertMention =
        (nodeType: 'userMention' | 'issueMention'): Suggestion['command'] =>
        ({ editor, range, props }) => {
            editor
                .chain()
                .focus()
                .insertContentAt(range, [
                    { type: nodeType, attrs: props },
                    { type: 'text', text: ' ' },
                ])
                .run();
        };

    const userSuggestion: Suggestion = {
        char: '@',
        items: ({ query }) => filterUsersByMention(usersRef.current, query),
        command: insertMention('userMention'),
        render: render('user') as Suggestion['render'],
    };

    const issueSuggestion: Suggestion = {
        char: '#',
        items: async ({ query, signal }) => {
            const projectId = projectIdRef.current;

            if (!projectId || !/^\d+$/.test(query)) return [];

            const request = ++issueRequestRef.current;

            try {
                const { data } = await axios.get<IssueSuggestion[]>(
                    route('projects.issues.search', projectId),
                    { params: { q: query }, signal },
                );

                if (request === issueRequestRef.current) {
                    lastIssuesRef.current = data;
                }
            } catch {
                if (request === issueRequestRef.current) {
                    lastIssuesRef.current = [];
                }
            }

            return lastIssuesRef.current;
        },
        command: insertMention('issueMention'),
        render: render('issue') as Suggestion['render'],
    };

    return {
        menu,
        setActiveIndex: (activeIndex: number) => {
            if (menuRef.current) update({ ...menuRef.current, activeIndex });
        },
        userSuggestion,
        issueSuggestion,
    };
}
