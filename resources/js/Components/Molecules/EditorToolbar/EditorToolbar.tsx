import { useEditorState } from '@tiptap/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import React, { useRef, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { EditorToolbarProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { FOCUS_RING_INSET } from '@/utils/focusRing';
import { formatBindingParts } from '@/utils/shortcutKeys';
import { normalizeLinkHref, TOOLBAR_GROUPS, ToolbarItem } from './toolbarItems';

const BUTTON =
    'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-(--text-gray-color) transition-colors duration-150 hover:bg-(--bg-light-color) hover:text-(--text-color) disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent pointer-coarse:h-10 pointer-coarse:w-10';

interface ItemState {
    active: boolean;
    disabled: boolean;
}

/**
 * The formatting bar of the description editor: bold, headings, lists, link,
 * table and so on, shown while editing. It is a WAI-ARIA toolbar - one tab
 * stop, the arrow keys / Home / End move between its buttons - and every
 * button toggles on the current selection, so a keyboard or touch user gets
 * what the markdown shortcuts give someone who knows them.
 */
export default function EditorToolbar({
    editor,
    onPickImage,
    className,
}: EditorToolbarProps) {
    const { t } = useLaravelReactI18n();
    const [isLinkOpen, setIsLinkOpen] = useState(false);
    const [linkValue, setLinkValue] = useState('');
    const [linkInvalid, setLinkInvalid] = useState(false);
    const [focusId, setFocusId] = useState('bold');
    const buttonRefs = useRef(new Map<string, HTMLButtonElement>());

    const groups = TOOLBAR_GROUPS.map((group) =>
        group.filter((item) => item.kind !== 'image' || onPickImage),
    ).filter((group) => group.length > 0);

    const states = useEditorState({
        editor,
        selector: ({ editor: current }): Record<string, ItemState> =>
            Object.fromEntries(
                groups.flat().map((item) => [
                    item.id,
                    {
                        active: item.isActive(current),
                        disabled:
                            (item.isDisabled?.(current) ?? false) ||
                            (item.kind !== 'image' &&
                                !item
                                    .apply(current.can().chain().focus())
                                    .run()),
                    },
                ]),
            ),
    });

    const items = groups.flat();
    const enabledIds = items
        .filter((item) => !states[item.id]?.disabled)
        .map((item) => item.id);
    // The one button in the tab order; falls back when it became disabled.
    const tabStop = enabledIds.includes(focusId) ? focusId : enabledIds[0];

    const label = (item: ToolbarItem) => {
        const text = t(item.labelKey);

        return item.shortcut
            ? t('editor_toolbar.with_shortcut', {
                  label: text,
                  keys: formatBindingParts(item.shortcut).join('+'),
              })
            : text;
    };

    const moveFocus = (id: string | undefined) => {
        if (!id) return;

        setFocusId(id);
        buttonRefs.current.get(id)?.focus();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const current = enabledIds.indexOf(
            (document.activeElement as HTMLElement | null)?.dataset
                .toolbarItem ?? '',
        );

        if (current === -1) return;

        const target = {
            ArrowRight: enabledIds[(current + 1) % enabledIds.length],
            ArrowLeft:
                enabledIds[
                    (current - 1 + enabledIds.length) % enabledIds.length
                ],
            Home: enabledIds[0],
            End: enabledIds[enabledIds.length - 1],
        }[event.key];

        if (!target) return;

        event.preventDefault();
        moveFocus(target);
    };

    const openLink = () => {
        setLinkValue(editor.getAttributes('link').href ?? '');
        setLinkInvalid(false);
        setIsLinkOpen(true);
    };

    const closeLink = () => {
        setIsLinkOpen(false);
        editor.chain().focus().run();
    };

    const applyLink = (event: React.FormEvent) => {
        event.preventDefault();

        const href = normalizeLinkHref(linkValue);

        if (!href) {
            setLinkInvalid(true);

            return;
        }

        const chain = editor.chain().focus().extendMarkRange('link');

        if (editor.state.selection.empty && !editor.isActive('link')) {
            chain
                .insertContent({
                    type: 'text',
                    text: href,
                    marks: [{ type: 'link', attrs: { href } }],
                })
                .run();
        } else {
            chain.setLink({ href }).run();
        }

        setIsLinkOpen(false);
    };

    const removeLink = () => {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
        setIsLinkOpen(false);
    };

    const press = (item: ToolbarItem) => {
        if (item.kind === 'link') return openLink();
        if (item.kind === 'image') return onPickImage?.();

        item.apply(editor.chain().focus()).run();
    };

    if (isLinkOpen) {
        return (
            <form
                onSubmit={applyLink}
                onKeyDown={(event) => {
                    if (event.key !== 'Escape') return;

                    // Closes the field, not the whole edit.
                    event.preventDefault();
                    event.stopPropagation();
                    closeLink();
                }}
                className={cn(
                    'flex items-center gap-1.5 border-b border-(--border-color) pb-2',
                    className,
                )}
            >
                <input
                    type="text"
                    inputMode="url"
                    autoFocus
                    value={linkValue}
                    onChange={(event) => {
                        setLinkValue(event.target.value);
                        setLinkInvalid(false);
                    }}
                    aria-label={t('editor_toolbar.link_url')}
                    aria-invalid={linkInvalid}
                    placeholder={t('editor_toolbar.link_placeholder')}
                    className={cn(
                        'h-8 min-w-0 flex-1 rounded-md border bg-(--bg-light-color) px-2 text-sm text-(--text-color) placeholder:text-(--text-muted-color) pointer-coarse:h-10 pointer-coarse:text-base',
                        linkInvalid
                            ? 'border-(--error-color)'
                            : 'border-transparent',
                        FOCUS_RING_INSET,
                    )}
                />
                <button
                    type="submit"
                    aria-label={t('common.apply')}
                    title={t('common.apply')}
                    className={cn(BUTTON, FOCUS_RING_INSET)}
                >
                    <Icon name="Check" size={14} />
                </button>
                {editor.isActive('link') && (
                    <button
                        type="button"
                        aria-label={t('common.remove')}
                        title={t('common.remove')}
                        onClick={removeLink}
                        className={cn(BUTTON, FOCUS_RING_INSET)}
                    >
                        <Icon name="Unlink" size={14} />
                    </button>
                )}
                <button
                    type="button"
                    aria-label={t('common.cancel')}
                    title={t('common.cancel')}
                    onClick={closeLink}
                    className={cn(BUTTON, FOCUS_RING_INSET)}
                >
                    <Icon name="X" size={14} />
                </button>
            </form>
        );
    }

    return (
        <div
            role="toolbar"
            aria-label={t('editor_toolbar.label')}
            aria-orientation="horizontal"
            onKeyDown={handleKeyDown}
            // Pressing a button must not pull focus (and the selection it acts
            // on) out of the editor.
            onMouseDown={(event) => event.preventDefault()}
            className={cn(
                // One row that scrolls sideways on a narrow screen.
                'flex items-center gap-0.5 overflow-x-auto overscroll-x-contain border-b border-(--border-color) pb-2 [scrollbar-width:none]',
                className,
            )}
        >
            {groups.map((group, index) => (
                <React.Fragment key={group[0].id}>
                    {index > 0 && (
                        <span
                            role="separator"
                            aria-orientation="vertical"
                            className="mx-1 h-5 w-px shrink-0 bg-(--border-color)"
                        />
                    )}
                    {group.map((item) => {
                        const state = states[item.id];

                        return (
                            <button
                                key={item.id}
                                type="button"
                                ref={(node) => {
                                    if (node)
                                        buttonRefs.current.set(item.id, node);
                                    else buttonRefs.current.delete(item.id);
                                }}
                                data-toolbar-item={item.id}
                                aria-label={t(item.labelKey)}
                                title={label(item)}
                                aria-pressed={
                                    item.kind === 'image'
                                        ? undefined
                                        : state?.active
                                }
                                disabled={state?.disabled}
                                tabIndex={item.id === tabStop ? 0 : -1}
                                onFocus={() => setFocusId(item.id)}
                                onClick={() => press(item)}
                                className={cn(
                                    BUTTON,
                                    FOCUS_RING_INSET,
                                    state?.active &&
                                        'bg-(--accent-color)/15 text-(--accent-color) hover:bg-(--accent-color)/20 hover:text-(--accent-color)',
                                )}
                            >
                                <Icon name={item.icon} size={15} />
                            </button>
                        );
                    })}
                </React.Fragment>
            ))}
        </div>
    );
}
