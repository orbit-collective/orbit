import type { Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { Transaction } from '@tiptap/pm/state';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import React, { useEffect, useId, useRef, useState } from 'react';
import { Markdown } from 'tiptap-markdown';
import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import Keybind from '@/Components/Atoms/Keybind/Keybind';
import EditorToolbar from '@/Components/Molecules/EditorToolbar/EditorToolbar';
import MentionSuggestions from '@/Components/Molecules/MentionSuggestions/MentionSuggestions';
import SlashCommandMenu from '@/Components/Molecules/SlashCommandMenu/SlashCommandMenu';
import { EditableMarkdownProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { FOCUS_RING_INSET } from '@/utils/focusRing';
import { extractImageFiles, markdownImageAlt } from '@/utils/imagePaste';
import { MarkdownTable } from '@/utils/markdownTable';
import { formatBindingParts } from '@/utils/shortcutKeys';
import { IssueMention, UserMention } from './mentionExtensions';
import { SlashCommands } from './slashExtension';
import { useMentionSuggestions } from './useMentionSuggestions';
import { useSlashCommands } from './useSlashCommands';

/** The editing surface; null while the editor is not mounted yet (it throws then). */
const editorDom = (editor: Editor | null): HTMLElement | null => {
    try {
        return editor?.view.dom ?? null;
    } catch {
        return null;
    }
};

const EditableMarkdown: React.FC<EditableMarkdownProps> = ({
    value,
    onSave,
    onImageUpload,
    placeholder,
    disabled = false,
    className,
    users,
    projectId,
    onEditingChange,
}) => {
    const { t, tChoice } = useLaravelReactI18n();
    const [isEditing, setIsEditing] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [pendingUploads, setPendingUploads] = useState(0);
    // Read by save()/cancel(), which can run from a Tiptap key handler: ending
    // the session mid-upload would insert the image into an editor that is no
    // longer editable and never saved.
    const pendingUploadsRef = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Set when a session ends so focus goes back to the "Edit" button.
    const restoreFocusRef = useRef(false);
    // Tiptap's key handler is created once; it saves through this ref.
    const saveRef = useRef(() => {});

    const listboxId = useId();
    const slashListboxId = useId();
    const hintId = useId();
    const { menu, setActiveIndex, userSuggestion, issueSuggestion } =
        useMentionSuggestions({ users, projectId });
    const {
        menu: slashMenu,
        setActiveIndex: setSlashActiveIndex,
        slashSuggestion,
    } = useSlashCommands({
        canInsertImage: Boolean(onImageUpload) && !disabled,
        onPickImage: () => fileInputRef.current?.click(),
    });

    const editor = useEditor({
        editable: false,
        content: value || '',
        extensions: [
            StarterKit.configure({
                link: { openOnClick: false },
                // Markdown has no underline, so Ctrl+U would be lost on save.
                underline: false,
            }),
            Markdown.configure({ html: false }),
            Placeholder.configure({
                placeholder: placeholder ?? t('editable_markdown.placeholder'),
                showOnlyWhenEditable: false,
            }),
            TaskList,
            TaskItem.configure({ nested: true }),
            // The table node is our own: tiptap-markdown drops a table that
            // has no header row or a multi-line cell.
            TableKit.configure({ table: false }),
            MarkdownTable,
            Image,
            SlashCommands.configure({ suggestion: slashSuggestion }),
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
        editorProps: {
            attributes: {
                class: 'prose max-w-none text-sm focus:outline-hidden',
            },
            // Ctrl/Cmd+Enter saves. Handled here, not on the wrapper, because
            // Tiptap's own keymap would otherwise also insert a line break.
            handleKeyDown: (_view, event) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    saveRef.current();

                    return true;
                }

                return false;
            },
            handlePaste: (_view, event) => {
                const files = extractImageFiles(event.clipboardData);

                if (!canUploadImages() || files.length === 0) return false;

                event.preventDefault();
                void insertImages(files);

                return true;
            },
        },
    });

    useEffect(() => {
        onEditingChange?.(isEditing);
    }, [isEditing]);

    // Ending a session unmounts the buttons that were focused, so focus
    // returns to "Edit" instead of falling back to the top of the page.
    useEffect(() => {
        if (isEditing || !restoreFocusRef.current) return;

        restoreFocusRef.current = false;
        containerRef.current
            ?.querySelector<HTMLElement>('[data-edit-trigger]')
            ?.focus();
    }, [isEditing]);

    // The editing surface is a role="textbox": name it, point it at the
    // keyboard hints while editing, and while a suggestion menu is open at its
    // active row so a screen reader announces the option the arrows landed on.
    const openList = slashMenu
        ? { id: slashListboxId, index: slashMenu.activeIndex }
        : menu && menu.users.length + menu.issues.length > 0
          ? { id: listboxId, index: menu.activeIndex }
          : null;

    useEffect(() => {
        const dom = editorDom(editor);

        if (!dom) return;

        dom.setAttribute('aria-label', t('editable_markdown.aria_label'));

        if (isEditing) dom.setAttribute('aria-describedby', hintId);
        else dom.removeAttribute('aria-describedby');

        if (openList) {
            dom.setAttribute('aria-controls', openList.id);
            dom.setAttribute(
                'aria-activedescendant',
                `${openList.id}-option-${openList.index}`,
            );
        } else {
            dom.removeAttribute('aria-controls');
            dom.removeAttribute('aria-activedescendant');
        }
    }, [editor, isEditing, openList?.id, openList?.index, hintId, t]);

    useEffect(() => {
        if (!editor || isEditing) return;

        const current = editor.storage.markdown.getMarkdown();
        if (current !== (value || '')) {
            editor.commands.setContent(value || '');
        }
    }, [value, editor]);

    const canUploadImages = () => Boolean(onImageUpload) && !disabled;

    /**
     * Uploads sequentially and inserts each image as soon as its URL comes
     * back, so a multi-image paste doesn't wait for the slowest file. The
     * insertion point is captured when the paste or drop happens and carried
     * through every transaction that lands while the upload runs, so it keeps
     * pointing at the same spot in the document however the text around it
     * changed - another image landing there included, which `assoc = 1` puts
     * after it.
     */
    const insertImages = async (files: File[], at?: number) => {
        if (!editor || !onImageUpload) return;

        setPendingUploads((count) => count + files.length);
        pendingUploadsRef.current += files.length;

        let position = at ?? editor.state.selection.to;

        const trackPosition = ({
            transaction,
        }: {
            transaction: Transaction;
        }) => {
            if (transaction.docChanged) {
                position = transaction.mapping.map(position, 1);
            }
        };

        editor.on('transaction', trackPosition);

        try {
            for (const file of files) {
                try {
                    const url = await onImageUpload(file);

                    editor
                        .chain()
                        .focus()
                        .insertContentAt(
                            Math.min(position, editor.state.doc.content.size),
                            {
                                type: 'image',
                                // Serialized back out as `![alt](src)`, so the
                                // alt has to survive the round trip the same
                                // way a textarea surface's does.
                                attrs: {
                                    src: url,
                                    alt: markdownImageAlt(file.name),
                                },
                            },
                        )
                        .run();
                } catch {
                    // The uploader already reported the failure to the user;
                    // the remaining files in this batch still get their turn.
                } finally {
                    setPendingUploads((count) => Math.max(0, count - 1));
                    pendingUploadsRef.current = Math.max(
                        0,
                        pendingUploadsRef.current - 1,
                    );
                }
            }
        } finally {
            editor.off('transaction', trackPosition);
        }
    };

    // Leaving the editor (a click elsewhere, the keyboard focus moving on) no
    // longer saves: the draft stays open until Save or Cancel.
    const save = () => {
        if (!editor || !isEditing || pendingUploadsRef.current > 0) return;

        restoreFocusRef.current = true;
        setIsEditing(false);
        editor.setEditable(false);

        const markdown = editor.storage.markdown.getMarkdown();
        if (markdown !== (value || '')) {
            onSave(markdown);
        }
    };
    saveRef.current = save;

    const cancel = () => {
        if (!editor || pendingUploadsRef.current > 0) return;

        restoreFocusRef.current = true;
        editor.commands.setContent(value || '');
        editor.setEditable(false);
        setIsEditing(false);
    };

    const startEditing = () => {
        if (disabled || !editor || isEditing) return;

        editor.setEditable(true);
        setIsEditing(true);
        editor.commands.focus('end');
    };

    const insertPickedImages = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []).filter((file) =>
            file.type.startsWith('image/'),
        );

        // Clearing the input lets the same file be picked twice in a row.
        event.target.value = '';

        if (files.length > 0) void insertImages(files);
    };

    /**
     * Clicking a rendered image opens the file instead of starting an edit -
     * the same behaviour a comment's images have. While editing it stays out
     * of the way, so the image node can still be selected and deleted.
     */
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

    /**
     * Drop is handled on the wrapper rather than through Tiptap's
     * `handleDrop`, because a file can be dropped onto the rendered
     * (non-editable) description too - that has to open the editor first.
     */
    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        setIsDraggingOver(false);

        const files = extractImageFiles(event.dataTransfer);

        if (!canUploadImages() || files.length === 0) return;

        event.preventDefault();

        startEditing();

        const droppedAt = editor?.view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
        })?.pos;

        void insertImages(files, droppedAt);
    };

    const saveKeys = formatBindingParts('mod+enter');

    return (
        <div
            ref={containerRef}
            onClick={handleClick}
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cancel();
                }
            }}
            onDragOver={(e) => {
                if (!canUploadImages()) return;

                e.preventDefault();
                setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
            className={cn(
                'relative',
                // The frame has its (transparent) border and padding in both
                // states, with the same negative margin, so entering the edit
                // mode never moves the text.
                !disabled &&
                    'group/editable -mx-3 rounded-lg border border-transparent px-3 py-2 transition-colors',
                !disabled &&
                    !isEditing &&
                    'cursor-text hover:bg-(--bg-light-color)/30 pointer-coarse:pr-12',
                !disabled &&
                    isEditing &&
                    'border-(--accent-color)/60 bg-(--bg-color)',
                isDraggingOver &&
                    'rounded-lg ring-2 ring-(--accent-color) ring-offset-2 ring-offset-(--bg-color)',
                className,
            )}
        >
            {isEditing && editor && (
                <EditorToolbar
                    editor={editor}
                    onPickImage={
                        canUploadImages()
                            ? () => fileInputRef.current?.click()
                            : undefined
                    }
                    className="sticky top-0 z-10 mb-2 bg-(--bg-color) pt-0.5"
                />
            )}
            <EditorContent editor={editor} />
            {!disabled && !isEditing && (
                <button
                    type="button"
                    data-edit-trigger
                    aria-label={t('editable_markdown.edit')}
                    title={t('editable_markdown.edit')}
                    onClick={(e) => {
                        e.stopPropagation();
                        startEditing();
                    }}
                    // Revealed on hover and on focus; a touch screen has no
                    // hover, so there it is always shown (and bigger).
                    className={cn(
                        'absolute top-1.5 right-1.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-(--border-color) bg-(--bg-color) text-(--text-gray-color) opacity-0 transition-opacity duration-150 hover:text-(--text-color) focus-visible:opacity-100 group-hover/editable:opacity-100 pointer-coarse:h-10 pointer-coarse:w-10 pointer-coarse:opacity-100',
                        FOCUS_RING_INSET,
                    )}
                >
                    <Icon name="Pencil" size={14} />
                </button>
            )}
            {isEditing && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-(--border-color) pt-3"
                >
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            onClick={save}
                            isDisabled={pendingUploads > 0}
                            className="min-h-10 px-4 sm:min-h-8"
                        >
                            {t('common.save')}
                        </Button>
                        <Button
                            type="button"
                            isBox
                            onClick={cancel}
                            isDisabled={pendingUploads > 0}
                            className="min-h-10 px-4 text-(--text-gray-color) sm:min-h-8"
                        >
                            {t('common.cancel')}
                        </Button>
                    </div>
                    {/* Keyboard hints mean nothing on a touch screen. */}
                    <p
                        id={hintId}
                        className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-(--text-muted-color) sm:flex"
                    >
                        <span className="flex items-center gap-1">
                            {saveKeys.map((key) => (
                                <Keybind
                                    key={key}
                                    keybind={key}
                                    tooltip={false}
                                    tooltipText=""
                                />
                            ))}
                            {t('editable_markdown.hint.save')}
                        </span>
                        <span className="flex items-center gap-1">
                            <Keybind
                                keybind="Esc"
                                tooltip={false}
                                tooltipText=""
                            />
                            {t('editable_markdown.hint.cancel')}
                        </span>
                        <span className="flex items-center gap-1">
                            <Keybind
                                keybind="/"
                                tooltip={false}
                                tooltipText=""
                            />
                            {t('editable_markdown.hint.blocks')}
                        </span>
                    </p>
                </div>
            )}
            {canUploadImages() && (
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    tabIndex={-1}
                    aria-hidden="true"
                    data-testid="editable-markdown-file-input"
                    className="sr-only"
                    onChange={insertPickedImages}
                />
            )}
            {slashMenu && (
                <SlashCommandMenu
                    id={slashListboxId}
                    items={slashMenu.items}
                    activeIndex={slashMenu.activeIndex}
                    position={slashMenu.position}
                    onSelect={slashMenu.select}
                    onHover={setSlashActiveIndex}
                />
            )}
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
            {pendingUploads > 0 && (
                <span
                    role="status"
                    className="mt-1 block text-xs text-(--text-gray-color)"
                >
                    {tChoice('editable_markdown.uploading', pendingUploads)}
                </span>
            )}
        </div>
    );
};

export default EditableMarkdown;
