import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Icon from '@/Components/Atoms/Icon/Icon';
import { MentionSuggestionsProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { createPortal } from 'react-dom';

/**
 * Floating "@mention" suggestion list, positioned at an arbitrary viewport
 * coordinate (the typed "@" inside a textarea) rather than anchored to a
 * trigger element, so it's rendered through a portal with its own fixed
 * position instead of reusing useFloatingDropdown (which tracks a trigger
 * element's bounding box). Styled like the filter/label/priority dropdowns
 * (EditableSelect, InlineSelectDropdown) so it reads as the same control.
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

    const rowClass = (isActive: boolean) =>
        cn(
            'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-all duration-150',
            isActive
                ? 'bg-[var(--accent-color)]/10 text-[var(--text-color)]'
                : 'text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]',
        );

    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: position.top,
                left,
                width: MENU_WIDTH,
                maxWidth: 'calc(100vw - 16px)',
                zIndex: 9999,
            }}
            className="animate-in fade-in zoom-in-95 overflow-hidden rounded-2xl bg-[var(--bg-dark-color)] shadow-2xl backdrop-blur-md duration-100 motion-reduce:animate-none"
        >
            <p className="px-3 pt-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]">
                {isIssue ? 'Issues' : 'Members'}
            </p>
            {isEmpty ? (
                <div
                    role="status"
                    className="flex flex-col items-center gap-1.5 px-3 py-6 text-center"
                >
                    <Icon
                        name="SearchX"
                        size={18}
                        className="text-[var(--text-muted-color)]"
                    />
                    <p className="text-xs font-medium text-[var(--text-muted-color)]">
                        {emptyLabel}
                    </p>
                </div>
            ) : (
                <div
                    id={id}
                    role="listbox"
                    aria-label={
                        isIssue ? 'Issue suggestions' : 'Member suggestions'
                    }
                    className="mt-2 max-h-64 space-y-0.5 overflow-y-auto overflow-x-hidden p-1.5 pt-0"
                >
                    {isIssue
                        ? issues.map((issue, index) => (
                              <button
                                  key={issue.id}
                                  id={id && `${id}-option-${index}`}
                                  type="button"
                                  role="option"
                                  aria-selected={index === activeIndex}
                                  title={issue.title}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onMouseEnter={() => onHover(index)}
                                  onClick={() => onSelectIssue?.(issue)}
                                  className={rowClass(index === activeIndex)}
                              >
                                  <span className="shrink-0 text-[var(--text-muted-color)]">
                                      #{issue.id}
                                  </span>
                                  <span className="truncate font-medium">
                                      {issue.title}
                                  </span>
                              </button>
                          ))
                        : users.map((user, index) => (
                              <button
                                  key={user.id}
                                  id={id && `${id}-option-${index}`}
                                  type="button"
                                  role="option"
                                  aria-selected={index === activeIndex}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onMouseEnter={() => onHover(index)}
                                  onClick={() => onSelect(user)}
                                  className={rowClass(index === activeIndex)}
                              >
                                  <Avatar
                                      src={user.avatar ?? undefined}
                                      initials={user.name.charAt(0)}
                                      size="sm"
                                  />
                                  <span className="truncate font-medium">
                                      {user.name}
                                  </span>
                                  {(nameCounts.get(user.name) ?? 0) > 1 && (
                                      <span className="shrink-0 text-[var(--text-muted-color)]">
                                          #{user.id}
                                      </span>
                                  )}
                              </button>
                          ))}
                </div>
            )}
        </div>,
        document.body,
    );
}
