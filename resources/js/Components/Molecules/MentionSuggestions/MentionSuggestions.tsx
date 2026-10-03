import Avatar from '@/Components/Atoms/Avatar/Avatar';
import DropdownItem from '@/Components/Atoms/DropdownItem/DropdownItem';
import DropdownMenu from '@/Components/Atoms/DropdownMenu/DropdownMenu';
import { MentionSuggestionsProps } from '@/types/Components';
import { createPortal } from 'react-dom';

/**
 * Floating "@mention" suggestion list, positioned at an arbitrary viewport
 * coordinate (the typed "@" inside a textarea) rather than anchored to a
 * trigger element, so it's rendered through a portal with its own fixed
 * position instead of reusing useFloatingDropdown (which tracks a trigger
 * element's bounding box).
 */
const MENU_WIDTH = 240;

export default function MentionSuggestions({
    id,
    users,
    activeIndex,
    position,
    onSelect,
    onHover,
    kind = 'user',
    issues = [],
    onSelectIssue,
    emptyLabel,
}: MentionSuggestionsProps) {
    const isIssue = kind === 'issue';
    const isEmpty = isIssue ? issues.length === 0 : users.length === 0;

    if (isEmpty && !emptyLabel) return null;

    // Two project members can share a display name - without this, the list
    // would show two identical-looking rows with no way to tell which is
    // which before picking one.
    const nameCounts = new Map<string, number>();
    users.forEach((user) => {
        nameCounts.set(user.name, (nameCounts.get(user.name) ?? 0) + 1);
    });

    // The anchor is a raw caret coordinate, so near the right edge of the
    // viewport the menu would be clipped - pull it back inside.
    const left = Math.max(
        8,
        Math.min(position.left, window.innerWidth - MENU_WIDTH - 8),
    );

    return createPortal(
        <DropdownMenu
            position="floating"
            id={id}
            role={isEmpty ? undefined : 'listbox'}
            aria-label={isIssue ? 'Issue suggestions' : 'Member suggestions'}
            style={{
                position: 'fixed',
                top: position.top,
                left,
                minWidth: 200,
                maxWidth: 'min(360px, calc(100vw - 16px))',
                zIndex: 9999,
            }}
        >
            {isEmpty && (
                <div
                    role="status"
                    className="px-3 py-2 text-sm text-[var(--text-muted-color)]"
                >
                    {emptyLabel}
                </div>
            )}
            {isIssue &&
                issues.map((issue, index) => (
                    <DropdownItem
                        key={issue.id}
                        id={id && `${id}-option-${index}`}
                        role="option"
                        aria-selected={index === activeIndex}
                        title={issue.title}
                        appearance="flat"
                        isActive={index === activeIndex}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => onHover(index)}
                        onClick={() => onSelectIssue?.(issue)}
                        label={
                            <>
                                <span className="shrink-0 text-xs text-[var(--text-muted-color)]">
                                    #{issue.id}
                                </span>
                                <span className="truncate">{issue.title}</span>
                            </>
                        }
                    />
                ))}
            {!isIssue &&
                users.map((user, index) => (
                    <DropdownItem
                        key={user.id}
                        id={id && `${id}-option-${index}`}
                        role="option"
                        aria-selected={index === activeIndex}
                        appearance="flat"
                        isActive={index === activeIndex}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => onHover(index)}
                        onClick={() => onSelect(user)}
                        label={
                            <>
                                <Avatar
                                    src={user.avatar ?? undefined}
                                    initials={user.name.charAt(0)}
                                    size="sm"
                                />
                                <span className="truncate">{user.name}</span>
                                {(nameCounts.get(user.name) ?? 0) > 1 && (
                                    <span className="shrink-0 text-xs text-[var(--text-muted-color)]">
                                        #{user.id}
                                    </span>
                                )}
                            </>
                        }
                    />
                ))}
        </DropdownMenu>,
        document.body,
    );
}
