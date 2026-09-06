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
export default function MentionSuggestions({
    users,
    activeIndex,
    position,
    onSelect,
    onHover,
}: MentionSuggestionsProps) {
    if (users.length === 0) return null;

    // Two project members can share a display name - without this, the list
    // would show two identical-looking rows with no way to tell which is
    // which before picking one.
    const nameCounts = new Map<string, number>();
    users.forEach((user) => {
        nameCounts.set(user.name, (nameCounts.get(user.name) ?? 0) + 1);
    });

    return createPortal(
        <DropdownMenu
            position="floating"
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                minWidth: 200,
                zIndex: 9999,
            }}
        >
            {users.map((user, index) => (
                <DropdownItem
                    key={user.id}
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
