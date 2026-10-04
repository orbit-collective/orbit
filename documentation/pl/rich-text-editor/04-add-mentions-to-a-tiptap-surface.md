# Dodaj wzmianki do powierzchni Tiptap

Przećwiczony przykład: wzmianki `@member` i `#issue` w **opisie issue**, czyli w edytorze Tiptap za `EditableMarkdown`. Komentarze do issue miały już oba rodzaje (zob. [`../notifications/05-add-mention-support-to-a-free-text-field.md`](../notifications/05-add-mention-support-to-a-free-text-field.md)), ale komentarze to zwykła `<textarea>`, w której śledzenie wzmianek robi się ręcznie po zakresach znaków. Opis to Tiptap, więc ta sama funkcja jest zbudowana inaczej: wzmianki są **węzłami** dokumentu, a wykrywaniem znaku wywołującego zajmuje się wtyczka suggestion Tiptapa. Ten przewodnik opisuje ten system i jest wzorcem dla dodawania wzmianek do kolejnych powierzchni Tiptap.

## Dwie najważniejsze zasady w tym przewodniku

1. **Jeden zapisywany format, wspólny z komentarzami.** Wzmianka jest zapisana w markdownie jako ten sam token, którego używa komentarz — `@[Name](userId)` dla członka i `#[Title](issueId:number)` dla issue (część `:number` to numer w obrębie projektu; starsze tokeny `#[Title](issueId)` bez niej nadal się wczytują). Edytor zamienia te tokeny na węzły przy wczytywaniu opisu i zapisuje je z powrotem przy zapisie, więc kolumna w backendzie pozostaje zwykłym tekstem markdown, a backend znajduje wzmianki tym samym wyrażeniem regularnym co w komentarzach. Nigdy nie wymyślaj drugiego formatu tokenu dla drugiej powierzchni.
2. **Backend nigdy nie ufa klientowi, kto został wspomniany.** Opis zapisuje zwykłe żądanie `PATCH /issues/{issue}` bez pola `mentioned_user_ids`; `NotifyDescriptionMentions` sam parsuje zapisany tekst, zostawia tylko członków projektu issue, pomija autora zmiany i powiadamia wyłącznie o wzmiankach, których **nie było** w poprzednim opisie — poprawienie literówki nie powiadamia ponownie wszystkich już wymienionych.

## Pułapki, które ten projekt już obsługuje

- **Każda wtyczka `Suggestion` potrzebuje własnego `pluginKey`.** Dwie wtyczki suggestion ze wspólnym domyślnym kluczem sprawiają, że ProseMirror rzuca `Adding different instances of a keyed plugin (suggestion$)` w chwili tworzenia edytora. `createMentionNode` tworzy osobny klucz dla każdego typu węzła, więc nowy węzeł wzmianki nie zderzy się z istniejącymi dwoma.
- **Menu nie może zabierać fokusu.** `EditableMarkdown` zapisuje i kończy edycję w `onBlur`. `MentionSuggestions` już wywołuje `preventDefault()` na `mousedown` swoich wierszy, więc kliknięcie opcji zostawia fokus w edytorze; zachowaj to, jeśli budujesz inne menu.
- **`Escape` zamyka menu, a nie edycję.** Wrapper anuluje edycję na `Escape`; hook wywołuje `event.stopPropagation()` na natywnym zdarzeniu, gdy menu jest otwarte, żeby jedno naciśnięcie robiło jedną rzecz.
- **Wzmianka to link, a nie prośba o edycję.** Kliknięcie wyrenderowanego opisu zwykle zaczyna edycję. `handleClick` wraca wcześniej dla wszystkiego wewnątrz `<a>`, a tym właśnie renderuje się wzmianka o issue.
- **Zwykły tekst zostaje zwykłym tekstem.** Reguła `text` w `markdown-it` zatrzymuje się na `@` i `#`, a reguły wzmianek pasują tylko do pełnego tokenu `@[…](…)` / `#[…](…)`, więc `jane@example.com`, `issue #12` i nagłówek `# Heading` pozostają bez zmian.

## Krok 1 — Węzły wzmianek i ich obieg markdown

Plik: `resources/js/utils/tiptapMentions.ts`

`createMentionNode(kind)` buduje jeden śródliniowy, atomowy węzeł Tiptap. Zawiera wszystko, co jest specyficzne dla formatu markdown: jak węzeł się serializuje (`addStorage().markdown.serialize`), jak token jest rozpoznawany przy parsowaniu markdownu (`addStorage().markdown.parse.setup`, reguła śródliniowa `markdown-it` zarejestrowana **przed** `link`, żeby `@[Name](1)` nie został odczytany jako link), jaki HTML renderuje i parsuje (`data-orbit-mention`, `data-id`, `data-label`, `data-number`) oraz wtyczkę suggestion. Znak wywołujący, lista i zachowanie wyboru pochodzą z opcji `suggestion`, dostarczanej przez komponent edytora, bo potrzebuje stanu Reacta.

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

## Krok 2 — Nadaj wzmiankom o issue link i podgląd po najechaniu

Wzmianka o użytkowniku to ostylowany chip i nic więcej nie potrzebuje. Wzmianka o issue powinna zachowywać się jak w komentarzu: link do issue z kartą podglądu po najechaniu. To już istniejący komponent (`IssueMentionLink`), więc węzeł issue renderuje go przez widok węzła Reacta i bierze projekt z opcji `projectId`.

Plik: `resources/js/Components/Molecules/EditableMarkdown/IssueMentionNodeView.tsx`

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

Plik: `resources/js/Components/Molecules/EditableMarkdown/mentionExtensions.ts`

```ts
import { createMentionNode } from '@/utils/tiptapMentions';
import { ReactNodeViewRenderer } from '@tiptap/react';
import IssueMentionNodeView from './IssueMentionNodeView';

export { UserMention } from '@/utils/tiptapMentions';

export const IssueMention = createMentionNode('issue', () =>
    ReactNodeViewRenderer(IssueMentionNodeView),
);
```

`ReactNodeViewRenderer` jest wywoływany leniwie (dopiero gdy edytor buduje widoki węzłów), dzięki czemu `tiptapMentions.ts` nie zależy od Reacta, a testy jednostkowe edytora mogą mockować `@tiptap/react` bez dotykania węzłów.

## Krok 3 — Połącz cykl życia suggestion Tiptapa z istniejącym menu

Plik: `resources/js/Components/Molecules/EditableMarkdown/useMentionSuggestions.ts`

Wtyczka suggestion Tiptapa zarządza wykrywaniem znaku wywołującego i wywołuje `onStart` / `onUpdate` / `onKeyDown` / `onExit`. Hook zamienia je w jeden obiekt stanu `menu` dla tej samej listy `MentionSuggestions`, której używa pole komentarza (więc obie powierzchnie wyglądają i działają tak samo) oraz zwraca dwa obiekty opcji `suggestion` dla węzłów. Ponieważ edytor czyta swoje rozszerzenia **raz**, przy tworzeniu, wszystko, czego potrzebują wywołania suggestion (lista członków, id projektu, otwarte menu), jest czytane przez refy, a nigdy przechwytywane z renderu. `items` dla issues szuka w `projects.issues.search` po numerze projektowym i przekazuje `signal` Tiptapa do axios, żeby nieaktualne wyszukiwanie było przerywane.

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

## Krok 4 — Podłącz to w `EditableMarkdown`

Plik: `resources/js/types/Components.ts`

Oba propsy są opcjonalne i niezależne. Powierzchnia, która nie przekazuje żadnego (tylko do odczytu pole `overview` katalogu integracji), zachowuje się tak jak wcześniej; samo `users` włącza `@`, samo `projectId` włącza `#`.

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

Plik: `resources/js/Components/Molecules/EditableMarkdown/EditableMarkdown.tsx`

Zdestrukturyzuj nowe propsy:

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

Utwórz stan menu i dwie konfiguracje suggestion przed `useEditor`:

```tsx
    const listboxId = useId();
    const { menu, setActiveIndex, userSuggestion, issueSuggestion } =
        useMentionSuggestions({ users, projectId });
```

Dodaj węzły do listy rozszerzeń, tylko dla przekazanych propsów:

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

Nie zaczynaj edycji po kliknięciu linku wzmianki:

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

Wyrenderuj menu obok treści edytora:

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

Plik: `resources/js/Pages/Issues/Show.tsx`

Przekaż członków i id projektu tam, gdzie renderowany jest opis:

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

## Krok 5 — Powiadom wspomniane osoby

Wzmianka w komentarzu wywołuje `IssueMentioned` z `Comment`, który ją zawiera. Opis nie ma komentarza, więc pole `comment` zdarzenia może teraz być `null`.

Plik: `app/Events/IssueMentioned.php`

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

Plik: `app/Listeners/SendNotificationListener.php`

Treść powiadomienia mówi, gdzie padła wzmianka, więc wzmianka w opisie nie twierdzi, że była w komentarzu:

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

Plik: `app/Listeners/NotifyDescriptionMentions.php`

Reaguje na zdarzenia, w których opis może się zmienić — `IssueCreated` (każdy token jest nowy) i `IssueUpdated` (tylko gdy jego `changes` zawiera `description`; stary tekst jest w `changes['description']['old']`). Celowo **nie** działa dla importów: `IssueService::importIssue()` nie wywołuje żadnego z tych zdarzeń, więc masowy import z Jiry nie zasypie członków powiadomieniami o wzmiankach.

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

Plik: `app/Providers/AppServiceProvider.php`

Zarejestruj go obok pozostałych listenerów. Wywoływane przez niego zdarzenia `IssueMentioned` są już kierowane do `SendNotificationListener`, więc nic więcej nie wymaga zmian, a istniejące ustawienie powiadomień „wzmianka” odbiorcy nadal obowiązuje:

```php
        // "@[Name](id)" mentions in an issue description raise the same
        // IssueMentioned event comments do, handled by the listener above.
        Event::listen([
            IssueCreated::class,
            IssueUpdated::class,
        ], NotifyDescriptionMentions::class);
```

## Dodawanie wzmianek do innej powierzchni Tiptap

1. Wyrenderuj `EditableMarkdown` (albo własne `useEditor`) z `users` i/lub `projectId`. Jeśli to własny edytor, dodaj `UserMention` / `IssueMention` do jego rozszerzeń, skonfigurowane dwoma obiektami `suggestion` z `useMentionSuggestions`, i wyrenderuj `MentionSuggestions` na podstawie zwróconego `menu`.
2. Zapisuj markdown tak, jak wraca z edytora — nie przetwarzaj tokenów.
3. W backendzie, jeśli tekst powierzchni może wymieniać osoby i chcesz je powiadamiać, dodaj listener taki jak `NotifyDescriptionMentions` dla zdarzenia, które Twoja powierzchnia już wywołuje (sparsuj zapisany tekst, zrób część wspólną z członkami projektu, pomiń autora zmiany, porównaj z poprzednim tekstem). Użyj ponownie `IssueMentioned`; dodaj gałąź w treści powiadomienia dla nowego miejsca.
4. Po dodaniu lub zaktualizowaniu pakietów npm uruchom `make npm-install`, żeby kontener Docker `vite` je pobrał (`@tiptap/suggestion` został dodany dla tej funkcji).

## Testy

- `resources/js/utils/tiptapMentions.test.ts` — uruchamia **prawdziwy** `Editor` Tiptap z rozszerzeniem Markdown: token użytkownika i token issue przechodzą obieg bez zmian, starszy token bez numeru nadal się wczytuje, kilka wzmianek w jednym akapicie przetrwa, zwykłe `@home` / `#12` / `# Title` nie zamieniają się we wzmianki, a etykieta z HTML jest escapowana, a nie renderowana. To ten plik wychwycił awarię wspólnego `pluginKey`.
- `resources/js/Components/Molecules/EditableMarkdown/useMentionSuggestions.test.ts` — hook w izolacji: filtrowanie członków, pozycja menu, zawijanie strzałek, `Enter` wstawiający `{ id, label }`, `Escape` zamykający menu i zatrzymujący propagację, ignorowanie klawiszy bez menu, wyszukiwanie issues (wraz z sygnałem przerwania, tekst nienumeryczny bez wyszukiwania, nieudane wyszukiwanie dające pusty wynik), tytuły bez nawiasów i pusta etykieta „Type an issue number”.
- `resources/js/Components/Molecules/EditableMarkdown/mentionEditor.test.ts` — prawdziwy edytor połączony z prawdziwym hookiem: wpisanie `hi @ja` otwiera menu członków, a wybór daje `@[Jane Cooper](1) `, `#3` wyszukuje i daje `#[Login bug](201:3) `, adres e-mail nie otwiera menu, usunięcie znaku wywołującego zamyka je, a wczytane tokeny przetrwają nietknięte.
- `resources/js/Components/Molecules/EditableMarkdown/EditableMarkdown.test.tsx` — istniejące testy edytora, które mockują `@tiptap/react`; nadal przechodzą, bo węzły wzmianek są tworzone tylko przy przekazanych `users` / `projectId`.
- `tests/Feature/NotifyDescriptionMentionsTest.php` — członek wymieniony w nowym opisie dostaje powiadomienie z `null` zamiast komentarza; autor zmiany i nie-członkowie nigdy; edycja powiadamia tylko o nowo dodanych wzmiankach; aktualizacja, która nie dotyka opisu, nikogo nie powiadamia; oraz jeden przypadek end-to-end przez `PATCH /issues/{issue}`.
- `tests/Feature/SendNotificationListenerTest.php` — wzmianka bez komentarza mówi „in the description of”, wariant z komentarzem bez zmian.
