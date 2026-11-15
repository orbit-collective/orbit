import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import DropdownOption from '@/Components/Atoms/DropdownOption/DropdownOption';
import DropdownPanel from '@/Components/Atoms/DropdownPanel/DropdownPanel';
import { SlashCommandMenuProps } from '@/types/Components';

const MENU_WIDTH = 280;
const VIEWPORT_MARGIN = 8;
const ROW_HEIGHT = 44;
const LIST_MAX_HEIGHT = 288;
const MIN_HEIGHT = 120;

/**
 * Floating block list of the editor's "/" menu. Like `MentionSuggestions` it
 * sits at a caret coordinate through a portal and is built from the shared
 * DropdownPanel / DropdownOption atoms. Focus stays in the editor (the rows
 * swallow `mousedown`), so typing keeps narrowing the list; the arrow keys,
 * Enter and Escape are handled by the editor's suggestion plugin, which
 * points `aria-activedescendant` at the active row.
 */
export default function SlashCommandMenu({
    id,
    items,
    activeIndex,
    position,
    onSelect,
    onHover,
}: SlashCommandMenuProps) {
    const { t } = useLaravelReactI18n();

    // Arrowing past the visible rows keeps the active one in view.
    useEffect(() => {
        document
            .getElementById(`${id}-option-${activeIndex}`)
            ?.scrollIntoView?.({ block: 'nearest' });
    }, [id, activeIndex, items]);

    if (items.length === 0) return null;

    // The soft keyboard shrinks the visual viewport, not always the layout
    // one, so the room above and below the caret is measured on the visual.
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportBottom = viewport
        ? viewport.offsetTop + viewport.height
        : window.innerHeight;

    const left = Math.max(
        VIEWPORT_MARGIN,
        Math.min(
            position.left,
            window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN,
        ),
    );

    // Open upwards by default (the description sits low on a phone once the
    // keyboard is up) and drop below the caret only when there is more room.
    const wanted = Math.min(items.length * ROW_HEIGHT, LIST_MAX_HEIGHT) + 40;
    const spaceAbove = position.lineTop - viewportTop - VIEWPORT_MARGIN;
    const spaceBelow = viewportBottom - position.top - VIEWPORT_MARGIN;
    const opensUp = spaceAbove >= wanted || spaceAbove >= spaceBelow;
    const maxHeight = Math.max(opensUp ? spaceAbove : spaceBelow, MIN_HEIGHT);

    return createPortal(
        <DropdownPanel
            style={{
                position: 'fixed',
                ...(opensUp
                    ? { bottom: window.innerHeight - position.lineTop }
                    : { top: position.top }),
                left,
                maxHeight,
                width: MENU_WIDTH,
                maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
                zIndex: 9999,
            }}
        >
            <div
                id={id}
                role="listbox"
                aria-label={t('editable_markdown.slash.menu_label')}
                className="min-h-0 flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto overscroll-contain p-1.5"
            >
                {items.map((item, index) => (
                    <DropdownOption
                        key={item.id}
                        id={`${id}-option-${index}`}
                        role="option"
                        aria-selected={index === activeIndex}
                        tabIndex={-1}
                        indicator="none"
                        isSelected={index === activeIndex}
                        icon={item.icon}
                        label={item.title}
                        description={item.description}
                        className="min-h-11 py-2"
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => onHover(index)}
                        onClick={() => onSelect(index)}
                    />
                ))}
            </div>
        </DropdownPanel>,
        document.body,
    );
}
