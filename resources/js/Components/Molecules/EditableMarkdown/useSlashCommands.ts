import type {
    SuggestionKeyDownProps,
    SuggestionProps,
} from '@tiptap/suggestion';
import { SuggestionOptions } from '@tiptap/suggestion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useEffect, useRef, useState } from 'react';
import { SlashMenuItem } from '@/types/Components';
import {
    filterSlashCommands,
    SLASH_COMMANDS,
    SlashCommand,
} from './slashCommands';

type Suggestion = Partial<SuggestionOptions<SlashCommand, SlashCommand>>;

export interface SlashMenu {
    items: SlashMenuItem[];
    activeIndex: number;
    /** `top` is just below the typed "/", `lineTop` just above it. */
    position: { top: number; lineTop: number; left: number };
    /** Replaces the typed "/query" with the block at `index`. */
    select: (index: number) => void;
}

interface Options {
    /** Offers the "Image" block; false when uploads are off for this editor. */
    canInsertImage: boolean;
    /** Opens the file picker once the "Image" block was chosen. */
    onPickImage: () => void;
}

/**
 * Drives the "/" block menu of the description editor: bridges Tiptap's
 * suggestion lifecycle (start / update / keydown / exit) to React state, the
 * way `useMentionSuggestions` does for "@" and "#". The suggestion callbacks
 * are created once with the editor, so everything they read goes through refs.
 */
export function useSlashCommands({ canInsertImage, onPickImage }: Options) {
    const { t } = useLaravelReactI18n();
    const tRef = useRef(t);
    tRef.current = t;
    const canInsertImageRef = useRef(canInsertImage);
    canInsertImageRef.current = canInsertImage;
    const onPickImageRef = useRef(onPickImage);
    onPickImageRef.current = onPickImage;

    const [menu, setMenu] = useState<SlashMenu | null>(null);
    const menuRef = useRef<SlashMenu | null>(null);
    // The latest suggestion state, for re-measuring the caret on scroll.
    const suggestionRef = useRef<SuggestionProps<
        SlashCommand,
        SlashCommand
    > | null>(null);

    const update = (next: SlashMenu | null) => {
        menuRef.current = next;
        setMenu(next);
    };

    const menuPosition = (rect: DOMRect) => ({
        top: rect.bottom + 4,
        lineTop: rect.top - 4,
        left: rect.left,
    });

    const showMenu = (props: SuggestionProps<SlashCommand, SlashCommand>) => {
        suggestionRef.current = props;
        const rect = props.clientRect?.();

        // Nothing matches (or there is no caret to anchor to): the menu hides
        // but the trigger stays live, so deleting a letter brings it back.
        if (!rect || props.items.length === 0) return update(null);

        update({
            items: props.items.map((command) => ({
                id: command.id,
                icon: command.icon,
                title: tRef.current(command.titleKey),
                description: tRef.current(command.descriptionKey),
            })),
            activeIndex: 0,
            position: menuPosition(rect),
            select: (index) => {
                const command = props.items[index];

                if (command) props.command(command);
            },
        });
    };

    const handleKeyDown = ({ event }: SuggestionKeyDownProps) => {
        // Escape closes the menu, and with it only the menu: it must not also
        // cancel the edit, even when nothing matched and no menu is showing.
        if (event.key === 'Escape') {
            event.stopPropagation();
            update(null);

            return true;
        }

        const current = menuRef.current;

        if (!current) return false;

        const count = current.items.length;

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

    // The menu is fixed to viewport coordinates and Tiptap only reports the
    // caret when the text changes, so scrolling a container around the editor
    // (or resizing the window) would leave it behind: measure the caret again.
    const isOpen = menu !== null;

    useEffect(() => {
        if (!isOpen) return;

        const reposition = () => {
            const rect = suggestionRef.current?.clientRect?.();
            const current = menuRef.current;

            if (rect && current) {
                update({ ...current, position: menuPosition(rect) });
            }
        };

        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);

        return () => {
            window.removeEventListener('scroll', reposition, true);
            window.removeEventListener('resize', reposition);
        };
    }, [isOpen]);

    const slashSuggestion: Suggestion = {
        char: '/',
        items: ({ query, editor }) =>
            filterSlashCommands(
                SLASH_COMMANDS.filter(
                    (command) =>
                        (!command.requiresUpload ||
                            canInsertImageRef.current) &&
                        (command.isAvailable?.(editor) ?? true),
                ),
                query,
                tRef.current,
            ),
        // A "/" inside a code block is just a slash.
        allow: ({ state, range }) =>
            !state.doc.resolve(range.from).parent.type.spec.code,
        command: ({ editor, range, props }) => {
            props.run(editor, range);

            if (props.requiresUpload) onPickImageRef.current();
        },
        render: () => ({
            onStart: showMenu,
            onUpdate: showMenu,
            onKeyDown: handleKeyDown,
            onExit: () => update(null),
        }),
    };

    return {
        menu,
        /** Hides the menu, e.g. when the edit it belongs to ends. */
        closeMenu: () => update(null),
        setActiveIndex: (activeIndex: number) => {
            if (menuRef.current) update({ ...menuRef.current, activeIndex });
        },
        slashSuggestion,
    };
}
