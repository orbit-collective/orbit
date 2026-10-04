# Add mentions to a Tiptap surface

Worked example: `@member` and `#issue` mentions in the **issue description**, the Tiptap editor behind `EditableMarkdown`. Issue comments already had both (see [`../notifications/05-add-mention-support-to-a-free-text-field.md`](../notifications/05-add-mention-support-to-a-free-text-field.md)), but comments are a plain `<textarea>` whose mention bookkeeping is range-tracking by hand. The description is Tiptap, so the same feature is built differently: mentions are **nodes** in the document, and Tiptap's own suggestion plugin detects the trigger. This guide documents that system and is the template for adding mentions to any further Tiptap surface.

## The two rules that matter most here

1. **One persisted format, shared with comments.** A mention is stored in the markdown as the same token a comment uses — `@[Name](userId)` for a member and `#[Title](issueId:number)` for an issue (the `:number` part is the project-scoped number; older `#[Title](issueId)` tokens without it still load). The editor turns those tokens into nodes when it loads a description and writes them back out when it saves, so the backend column stays plain markdown text and the backend can find mentions with the same regular expression it uses for comments. Never invent a second token format for a second surface.
2. **The backend never trusts the client about who was mentioned.** The description is saved through the ordinary `PATCH /issues/{issue}` request with no `mentioned_user_ids` field; `NotifyDescriptionMentions` parses the saved text itself, keeps only members of the issue's project, drops the actor, and only notifies mentions that were **not** in the previous description — so fixing a typo does not re-notify everyone already named.

## Gotchas this design already handles

- **Every `Suggestion` plugin needs its own `pluginKey`.** Two suggestion plugins sharing the default key make ProseMirror throw `Adding different instances of a keyed plugin (suggestion$)` the moment the editor is created. `createMentionNode` builds one key per node type, so a new mention node cannot collide with the existing two.
- **The menu must not steal focus.** `EditableMarkdown` commits and leaves edit mode on `onBlur`. `MentionSuggestions` already calls `preventDefault()` on `mousedown` for its rows, so clicking an option leaves the editor focused; keep that if you build a different menu.
- **`Escape` closes the menu, not the edit.** The wrapper cancels editing on `Escape`; the hook calls `event.stopPropagation()` on the native event while a menu is open so one keypress does only one thing.
- **A mention is a link, not a request to edit.** Clicking the rendered description normally starts editing. `handleClick` returns early for anything inside an `<a>`, which is what an issue mention renders as.
- **Plain text stays plain.** `markdown-it`'s `text` rule stops at `@` and `#`, and the mention rules only match the full `@[…](…)` / `#[…](…)` token, so `jane@example.com`, `issue #12` and a `# Heading` are untouched.

## Step 1 — The mention nodes and their markdown round trip

File: `resources/js/utils/tiptapMentions.ts`

`createMentionNode(kind)` builds one inline, atomic Tiptap node. It carries everything that is specific to the markdown format: how the node serializes (`addStorage().markdown.serialize`), how a token is recognised when markdown is parsed (`addStorage().markdown.parse.setup`, a `markdown-it` inline rule registered **before** `link` so `@[Name](1)` is not read as a link), the HTML it renders and parses (`data-orbit-mention`, `data-id`, `data-label`, `data-number`), and the suggestion plugin. The trigger character, the list and the selection behaviour come from the `suggestion` option, supplied by the editor component because they need React state.

```ts
import { mergeAttributes, Node, NodeViewRenderer } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { Suggestion, SuggestionOptions } from '@tiptap/suggestion';

/**
 * Tiptap nodes for "@user" and "#issue" mentions in the issue description.
 *
 * They persist as the same markdown tokens comments use - "@[Name](userId)"
 * and "#[Title](issueId:number)" (see utils/mentions.ts) - so one format
 * serves both surfaces, and the backend finds description mentions with the
 * same pattern it uses for comments.
 */

type MentionKind = 'user' | 'issue';

/** The slice of markdown-it that the inline rule below touches. */
interface MarkdownItLike {
    inline: {
        ruler: {
            before: (
                beforeName: string,
                ruleName: string,
                fn: (state: InlineState, silent: boolean) => boolean,
            ) => void;
        };
    };
    renderer: {
        rules: Record<
            string,
            (tokens: { meta: MentionAttrs }[], index: number) => string
        >;
    };
    utils: { escapeHtml: (value: string) => string };
}

interface InlineState {
    src: string;
    pos: number;
    push: (
        type: string,
        tag: string,
        nesting: number,
    ) => { meta: MentionAttrs };
}

export interface MentionAttrs {
    id: number | null;
    label: string | null;
    number?: number | null;
}

const TOKEN_PATTERNS: Record<MentionKind, RegExp> = {
    user: /^@\[([^\]]+)\]\((\d+)\)/,
    issue: /^#\[([^\]]+)\]\((\d+)(?::(\d+))?\)/,
};

const CHIP_CLASS =
    'bg-[var(--accent-color)]/10 mx-0.5 rounded px-1 font-medium text-[var(--accent-color)]';

/** Brackets would break the token, and an empty label would not match it. */
export const sanitizeMentionLabel = (label: string, fallback: string) =>
    label.replace(/[[\]]/g, '').trim() || fallback;

const serializeToken = (kind: MentionKind, attrs: MentionAttrs) => {
    const label = sanitizeMentionLabel(attrs.label ?? '', `${attrs.id}`);

    if (kind === 'user') return `@[${label}](${attrs.id})`;

    return attrs.number != null
        ? `#[${label}](${attrs.id}:${attrs.number})`
        : `#[${label}](${attrs.id})`;
};

const displayText = (kind: MentionKind, attrs: MentionAttrs) =>
    kind === 'user' ? `@${attrs.label}` : `#${attrs.number ?? attrs.id}`;

const dataAttribute = (name: string) => ({
    default: null,
    parseHTML: (element: HTMLElement) => {
        const value = element.getAttribute(`data-${name}`);

        return value === null || value === '' ? null : value;
    },
    renderHTML: (attributes: Record<string, unknown>) =>
        attributes[name] == null ? {} : { [`data-${name}`]: attributes[name] },
});

export interface MentionNodeOptions {
    suggestion: Partial<SuggestionOptions>;
    /** Project the mentioned issues belong to; their links and previews are scoped to it. */
    projectId?: number;
}

/**
 * Builds one mention node type. `suggestion` carries the trigger character
 * and the list/selection behaviour; it is supplied by the editor component
 * because it needs React state (project members, the open menu).
 */
export const createMentionNode = (
    kind: MentionKind,
    nodeView?: () => NodeViewRenderer,
) => {
    const name = kind === 'user' ? 'userMention' : 'issueMention';
    const tokenType = `orbit_${kind}_mention`;
    // Two suggestion plugins in one editor need distinct keys.
    const pluginKey = new PluginKey(`orbit-${kind}-mention`);

    return Node.create<MentionNodeOptions>({
        name,
        group: 'inline',
        inline: true,
        atom: true,
        selectable: false,

        addOptions() {
            return { suggestion: {}, projectId: undefined };
        },

        addNodeView() {
            return nodeView ? nodeView() : null;
        },

        addAttributes() {
            return {
                id: dataAttribute('id'),
                label: dataAttribute('label'),
                ...(kind === 'issue'
                    ? { number: dataAttribute('number') }
                    : {}),
            };
        },

        parseHTML() {
            return [{ tag: `span[data-orbit-mention="${kind}"]` }];
        },

        renderHTML({ node, HTMLAttributes }) {
            return [
                'span',
                mergeAttributes(
                    { 'data-orbit-mention': kind, class: CHIP_CLASS },
                    HTMLAttributes,
                ),
                displayText(kind, node.attrs as MentionAttrs),
            ];
        },

        renderText({ node }) {
            return displayText(kind, node.attrs as MentionAttrs);
        },

        addStorage() {
            return {
                markdown: {
                    serialize(
                        state: { write: (text: string) => void },
                        node: { attrs: MentionAttrs },
                    ) {
                        state.write(serializeToken(kind, node.attrs));
                    },
                    parse: {
                        setup(md: MarkdownItLike) {
                            const sigil = kind === 'user' ? '@' : '#';

                            md.inline.ruler.before(
                                'link',
                                tokenType,
                                (state, silent) => {
                                    if (state.src[state.pos] !== sigil)
                                        return false;

                                    const match = TOKEN_PATTERNS[kind].exec(
                                        state.src.slice(state.pos),
                                    );

                                    if (!match) return false;

                                    if (!silent) {
                                        const token = state.push(
                                            tokenType,
                                            '',
                                            0,
                                        );
                                        token.meta =
                                            kind === 'user'
                                                ? {
                                                      label: match[1],
                                                      id: Number(match[2]),
                                                  }
                                                : {
                                                      label: match[1],
                                                      id: Number(match[2]),
                                                      number:
                                                          match[3] !== undefined
                                                              ? Number(match[3])
                                                              : null,
                                                  };
                                    }

                                    state.pos += match[0].length;

                                    return true;
                                },
                            );

                            md.renderer.rules[tokenType] = (tokens, index) => {
                                const attrs = tokens[index].meta;
                                const escape = md.utils.escapeHtml;
                                const number =
                                    attrs.number != null
                                        ? ` data-number="${attrs.number}"`
                                        : '';

                                return `<span data-orbit-mention="${kind}" data-id="${attrs.id}" data-label="${escape(attrs.label ?? '')}"${number}>${escape(displayText(kind, attrs))}</span>`;
                            };
                        },
                    },
                },
            };
        },

        addProseMirrorPlugins() {
            return [
                Suggestion({
                    editor: this.editor,
                    char: kind === 'user' ? '@' : '#',
                    pluginKey,
                    allowSpaces: false,
                    // Only offer a menu where this node type is allowed, so
                    // typing "@" inside a code block stays plain text.
                    allow: ({ state, range }) =>
                        state.doc
                            .resolve(range.from)
                            .parent.type.contentMatch.matchType(
                                state.schema.nodes[name],
                            ) !== null,
                    ...this.options.suggestion,
                } as SuggestionOptions),
            ];
        },
    });
};

export const UserMention = createMentionNode('user');
```

## Step 2 — Give issue mentions a link and a hover preview

A user mention is a styled chip and needs nothing more. An issue mention should behave like it does in a comment: a link to the issue with the preview card on hover. That is already a component (`IssueMentionLink`), so the issue node renders it through a React node view and takes the project from its `projectId` option.

File: `resources/js/Components/Molecules/EditableMarkdown/IssueMentionNodeView.tsx`

```tsx
import IssueMentionLink from '@/Components/Molecules/IssueMentionLink/IssueMentionLink';
import { MentionAttrs } from '@/utils/tiptapMentions';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';

/**
 * Renders an "#12" mention inside the description editor the way a comment
 * does: a link to the issue with the hover preview card.
 */
export default function IssueMentionNodeView({
    node,
    extension,
}: NodeViewProps) {
    const attrs = node.attrs as MentionAttrs;

    return (
        <NodeViewWrapper as="span" className="inline">
            <IssueMentionLink
                projectId={extension.options.projectId}
                issueId={Number(attrs.id)}
                title={attrs.label ?? ''}
                label={`#${attrs.number ?? attrs.id}`}
            />
        </NodeViewWrapper>
    );
}
```

File: `resources/js/Components/Molecules/EditableMarkdown/mentionExtensions.ts`

```ts
import { createMentionNode } from '@/utils/tiptapMentions';
import { ReactNodeViewRenderer } from '@tiptap/react';
import IssueMentionNodeView from './IssueMentionNodeView';

export { UserMention } from '@/utils/tiptapMentions';

export const IssueMention = createMentionNode('issue', () =>
    ReactNodeViewRenderer(IssueMentionNodeView),
);
```

`ReactNodeViewRenderer` is only called lazily (when the editor builds its node views), which keeps `tiptapMentions.ts` free of React and lets the editor's unit tests mock `@tiptap/react` without touching the nodes.

## Step 3 — Bridge Tiptap's suggestion lifecycle to the existing menu

File: `resources/js/Components/Molecules/EditableMarkdown/useMentionSuggestions.ts`

Tiptap's suggestion plugin owns trigger detection and calls `onStart` / `onUpdate` / `onKeyDown` / `onExit`. The hook turns those into one `menu` state object for the same `MentionSuggestions` list the comment box uses (so the two surfaces look and behave identically) and returns the two `suggestion` option objects for the nodes. Because the editor reads its extensions **once**, when it is created, everything the suggestion callbacks need (the member list, the project id, the open menu) is read through refs, never captured from a render. `items` for issues searches `projects.issues.search` by project number and passes Tiptap's `signal` to axios so a stale search is aborted.

```ts
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

    const command: Suggestion['command'] = ({ editor, range, props }) => {
        editor
            .chain()
            .focus()
            .insertContentAt(range, [
                {
                    type:
                        props.number !== undefined
                            ? 'issueMention'
                            : 'userMention',
                    attrs: props,
                },
                { type: 'text', text: ' ' },
            ])
            .run();
    };

    const userSuggestion: Suggestion = {
        char: '@',
        items: ({ query }) => filterUsersByMention(usersRef.current, query),
        command,
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
        command,
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
```

## Step 4 — Wire it into `EditableMarkdown`

File: `resources/js/types/Components.ts`

Both props are optional and independent. A surface that passes neither (the integration catalog's read-only `overview`) behaves exactly as before; `users` alone enables `@`, `projectId` alone enables `#`.

```ts
export interface EditableMarkdownProps {
    value: string;
    onSave: (value: string) => void;
    /** Resolves with the stored URL of an image pasted or dropped into the editor. Omit it to disable image uploads for this instance. */
    onImageUpload?: (file: File) => Promise<string>;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    /** Project members offered by "@" mentions. Omit to disable user mentions. */
    users?: AssignableUser[];
    /** Project whose issues "#12" mentions resolve against. Omit to disable issue mentions. */
    projectId?: number;
}
```

File: `resources/js/Components/Molecules/EditableMarkdown/EditableMarkdown.tsx`

Destructure the new props:

```tsx
const EditableMarkdown: React.FC<EditableMarkdownProps> = ({
    value,
    onSave,
    onImageUpload,
    placeholder = 'Add a description...',
    disabled = false,
    className,
    users,
    projectId,
}) => {
```

Create the menu state and the two suggestion configs before `useEditor`:

```tsx
    const listboxId = useId();
    const { menu, setActiveIndex, userSuggestion, issueSuggestion } =
        useMentionSuggestions({ users, projectId });
```

Add the nodes to the extension list, only for the props that were given:

```tsx
            // "@member" mentions need the project's members and "#12" mentions
            // need its id; an editor given neither keeps plain text behaviour.
            ...(users
                ? [UserMention.configure({ suggestion: userSuggestion })]
                : []),
            ...(projectId !== undefined
                ? [
                      IssueMention.configure({
                          projectId,
                          suggestion: issueSuggestion,
                      }),
                  ]
                : []),
        ],
```

Do not start an edit when a mention link is clicked:

```tsx
    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement;
        const image = target.closest?.('img');

        // A mention is a link (or a hover card trigger), not a request to edit.
        if (!isEditing && target.closest?.('a')) return;

        if (!isEditing && image?.src) {
            event.preventDefault();
            window.open(image.src, '_blank', 'noopener,noreferrer');

            return;
        }

        startEditing();
    };
```

Render the menu next to the editor content:

```tsx
            {menu && (
                <MentionSuggestions
                    id={listboxId}
                    kind={menu.kind}
                    users={menu.users}
                    issues={menu.issues}
                    onSelect={(user) =>
                        menu.select(
                            menu.users.findIndex((u) => u.id === user.id),
                        )
                    }
                    onSelectIssue={(issue) =>
                        menu.select(
                            menu.issues.findIndex((i) => i.id === issue.id),
                        )
                    }
                    emptyLabel={menu.emptyLabel}
                    activeIndex={menu.activeIndex}
                    position={menu.position}
                    onHover={setActiveIndex}
                />
            )}

```

File: `resources/js/Pages/Issues/Show.tsx`

Pass the project's members and id where the description is rendered:

```tsx
<EditableMarkdown
    value={issue.description || ''}
    onSave={(value) =>
        updateIssue({ description: value })
    }
    onImageUpload={uploadImage}
    users={users}
    projectId={project.id}
    placeholder="Add a description..."
/>
```

## Step 5 — Notify the people mentioned

A comment mention raises `IssueMentioned` with the `Comment` that contains it. A description has no comment, so the event's `comment` is now nullable.

File: `app/Events/IssueMentioned.php`

```php
<?php

namespace App\Events;

use App\Models\Comment;
use App\Models\Issue;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

final class IssueMentioned
{
    use Dispatchable;

    public function __construct(
        public readonly Issue $issue,
        /** Null when the mention is in the issue description rather than a comment. */
        public readonly ?Comment $comment,
        public readonly User $mentionedUser,
        public readonly ?User $actor,
    ) {}
}
```

File: `app/Listeners/SendNotificationListener.php`

The notification text names where the mention happened, so a description mention does not claim to be in a comment:

```php
    private function handleIssueMentioned(IssueMentioned $event): void
    {
        if ($event->actor && $event->actor->id === $event->mentionedUser->id) {
            return;
        }

        $issue = $event->issue;
        $actorName = $event->actor?->name ?? 'Someone';
        $where = $event->comment ? 'in a comment on' : 'in the description of';

        $this->notificationService->notify(
            $event->mentionedUser->id,
            NotificationType::IssueMentioned,
            'info',
            'You were mentioned',
            "$actorName mentioned you $where \"$issue->title\" (#$issue->number).",
            route('issues.show', [$issue->project_id, $issue->id])
        );
    }
```

File: `app/Listeners/NotifyDescriptionMentions.php`

It reacts to the events a description can change in — `IssueCreated` (every token is new) and `IssueUpdated` (only when its `changes` contain `description`; the old text is in `changes['description']['old']`). It deliberately does **not** run for imports: `IssueService::importIssue()` fires neither event, so a bulk Jira import cannot spam members with mention notifications.

```php
<?php

namespace App\Listeners;

use App\Events\IssueCreated;
use App\Events\IssueMentioned;
use App\Events\IssueUpdated;
use App\Models\Issue;
use App\Repositories\ProjectRepository;
use App\Repositories\UserRepository;

/**
 * Turns "@[Name](id)" mention tokens in an issue's description into
 * IssueMentioned events (the same ones comment mentions raise), so a
 * mentioned member gets the same notification either way.
 *
 * Only members of the issue's project are notified, never the actor, and
 * only for mentions that were not already in the previous description - so
 * editing other parts of a description doesn't re-notify everyone in it.
 */
class NotifyDescriptionMentions
{
    public function __construct(
        protected ProjectRepository $projectRepository,
        protected UserRepository $userRepository,
    ) {}

    public function handle(IssueCreated|IssueUpdated $event): void
    {
        if ($event instanceof IssueUpdated) {
            if (! array_key_exists('description', $event->changes)) {
                return;
            }

            $previous = $this->extractMentionedUserIds((string) ($event->changes['description']['old'] ?? ''));
        } else {
            $previous = [];
        }

        $mentioned = array_diff($this->extractMentionedUserIds((string) $event->issue->description), $previous);

        $this->notify($event->issue, $event->actor, $mentioned);
    }

    /**
     * @param  list<int>  $userIds
     */
    private function notify(Issue $issue, mixed $actor, array $userIds): void
    {
        $userIds = array_filter($userIds, fn (int $id) => $id !== $actor?->id);

        if (empty($userIds)) {
            return;
        }

        $memberIds = $this->projectRepository->getMemberIds($issue->project);

        foreach (array_intersect($userIds, $memberIds) as $userId) {
            $user = $this->userRepository->findById($userId);

            if ($user) {
                event(new IssueMentioned($issue, null, $user, $actor));
            }
        }
    }

    /**
     * @return list<int>
     */
    private function extractMentionedUserIds(string $description): array
    {
        preg_match_all('/@\[[^\]]+\]\((\d+)\)/', $description, $matches);

        return array_values(array_unique(array_map('intval', $matches[1] ?? [])));
    }
}
```

File: `app/Providers/AppServiceProvider.php`

Register it next to the other listeners. The `IssueMentioned` events it raises are already routed to `SendNotificationListener`, so nothing else needs touching and the recipient's existing "mentioned" notification preference applies:

```php
        // "@[Name](id)" mentions in an issue description raise the same
        // IssueMentioned event comments do, handled by the listener above.
        Event::listen([
            IssueCreated::class,
            IssueUpdated::class,
        ], NotifyDescriptionMentions::class);
```

## Adding mentions to another Tiptap surface

1. Render `EditableMarkdown` (or your own `useEditor`) with `users` and/or `projectId`. If it is your own editor, add `UserMention` / `IssueMention` to its extensions, configured with the two `suggestion` objects from `useMentionSuggestions`, and render `MentionSuggestions` from the returned `menu`.
2. Store the markdown as it comes back — do not post-process the tokens.
3. On the backend, if the surface's text can name people and you want them notified, add a listener like `NotifyDescriptionMentions` for the event your surface already fires (parse the saved text, intersect with project members, drop the actor, diff against the previous text). Reuse `IssueMentioned`; give its notification text a branch for the new location.
4. After adding or updating npm packages, run `make npm-install` so the Docker `vite` container picks them up (`@tiptap/suggestion` was added for this feature).

## Tests

- `resources/js/utils/tiptapMentions.test.ts` — runs a **real** Tiptap `Editor` with the Markdown extension: a user token and an issue token round-trip unchanged, an older token without a number still loads, several mentions in one paragraph survive, plain `@home` / `#12` / `# Title` are not turned into mentions, and a label containing HTML is escaped rather than rendered. This is the file that caught the shared-`pluginKey` crash.
- `resources/js/Components/Molecules/EditableMarkdown/useMentionSuggestions.test.ts` — the hook in isolation: member filtering, menu position, arrow-key wrap-around, `Enter` inserting `{ id, label }`, `Escape` closing the menu and stopping propagation, keys ignored with no menu, the issue search (and its abort signal, non-numeric text not searching, a failed search yielding nothing), bracket-free titles, and the "Type an issue number" empty label.
- `resources/js/Components/Molecules/EditableMarkdown/mentionEditor.test.ts` — the real editor wired to the real hook: typing `hi @ja` opens the member menu and picking one produces `@[Jane Cooper](1) `, `#3` searches and produces `#[Login bug](201:3) `, an email address opens no menu, deleting the trigger closes it, and loaded tokens survive untouched.
- `resources/js/Components/Molecules/EditableMarkdown/EditableMarkdown.test.tsx` — the existing editor tests, which mock `@tiptap/react`; they keep passing because the mention nodes are only instantiated when `users` / `projectId` are given.
- `tests/Feature/NotifyDescriptionMentionsTest.php` — a member named in a new description is notified with a `null` comment; the actor and non-members never are; an edit notifies only newly added mentions; an update that does not touch the description notifies nobody; and one end-to-end case through `PATCH /issues/{issue}`.
- `tests/Feature/SendNotificationListenerTest.php` — a mention with no comment says "in the description of", the comment variant is unchanged.
