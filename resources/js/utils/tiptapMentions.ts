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
