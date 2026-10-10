import Avatar from '@/Components/Atoms/Avatar/Avatar';
import DropdownOption from '@/Components/Atoms/DropdownOption/DropdownOption';
import DropdownPanel from '@/Components/Atoms/DropdownPanel/DropdownPanel';
import Icon from '@/Components/Atoms/Icon/Icon';
import IssuePreviewCard from '@/Components/Molecules/IssuePreviewCard/IssuePreviewCard';
import { MentionSuggestionsProps } from '@/types/Components';
import { toPreviewIssue } from '@/utils/mentions';
import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Floating "@mention" suggestion list, positioned at an arbitrary viewport
 * coordinate (the typed "@" inside a textarea) rather than anchored to a
 * trigger element, so it's rendered through a portal with its own fixed
 * position instead of reusing `Dropdown` (which anchors to a trigger
 * element). It is built from the same DropdownPanel / DropdownOption atoms,
 * so it reads as the same control as every other dropdown.
 */
const MENU_WIDTH = 240;
const TYPED_LINE_HEIGHT = 24;
const VIEWPORT_MARGIN = 8;
const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 32;
const LIST_MAX_HEIGHT = 256;

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
    const [cardAnchor, setCardAnchor] = useState<DOMRect | null>(null);
    const isIssue = kind === 'issue';
    const activeIssue = isIssue ? issues[activeIndex] : undefined;

    // The preview card sits above the menu - lifted by roughly one text
    // line so it clears the "#12" being typed - leaving every row visible.
    useLayoutEffect(() => {
        const panel = activeIssue
            ? document
                  .getElementById(`${id}-option-${activeIndex}`)
                  ?.closest('[role="listbox"]')?.parentElement
            : null;

        if (!panel) {
            setCardAnchor(null);
            return;
        }

        const rect = panel.getBoundingClientRect();
        setCardAnchor(
            new DOMRect(
                rect.left,
                // Below the caret the card is lifted past the typed line.
                rect.top >= position.top - 1
                    ? rect.top - TYPED_LINE_HEIGHT
                    : rect.top,
                rect.width,
                0,
            ),
        );
    }, [activeIssue, activeIndex, id, position]);

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

    // Open upwards by default (the comment form sits at the bottom of the
    // page, so a menu below it gets cut off) and only drop below the caret
    // when there's more room there than above.
    const rowCount = isIssue ? issues.length : users.length;
    const wanted =
        HEADER_HEIGHT +
        Math.min(Math.max(rowCount, 1) * ROW_HEIGHT, LIST_MAX_HEIGHT);
    const spaceAbove = position.lineTop - VIEWPORT_MARGIN;
    const spaceBelow = window.innerHeight - position.top - VIEWPORT_MARGIN;
    const opensUp = spaceAbove >= wanted || spaceAbove >= spaceBelow;
    const maxHeight = Math.max(opensUp ? spaceAbove : spaceBelow, 120);

    return (
        <>
            {createPortal(
                <DropdownPanel
                    style={{
                        position: 'fixed',
                        ...(opensUp
                            ? { bottom: window.innerHeight - position.lineTop }
                            : { top: position.top }),
                        left,
                        maxHeight,
                        width: MENU_WIDTH,
                        maxWidth: 'calc(100vw - 16px)',
                        zIndex: 9999,
                    }}
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
                                isIssue
                                    ? 'Issue suggestions'
                                    : 'Member suggestions'
                            }
                            className="mt-2 max-h-64 min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden p-1.5 pt-0"
                        >
                            {isIssue
                                ? issues.map((issue, index) => (
                                      <DropdownOption
                                          key={issue.id}
                                          id={id && `${id}-option-${index}`}
                                          role="option"
                                          aria-selected={index === activeIndex}
                                          title={issue.title}
                                          indicator="none"
                                          isSelected={index === activeIndex}
                                          onMouseDown={(e) =>
                                              e.preventDefault()
                                          }
                                          onMouseEnter={() => onHover(index)}
                                          onClick={() => onSelectIssue?.(issue)}
                                          label={
                                              <>
                                                  <span className="shrink-0 text-[var(--text-muted-color)]">
                                                      #
                                                      {issue.number ?? issue.id}
                                                  </span>
                                                  <span className="truncate">
                                                      {issue.title}
                                                  </span>
                                              </>
                                          }
                                      />
                                  ))
                                : users.map((user, index) => (
                                      <DropdownOption
                                          key={user.id}
                                          id={id && `${id}-option-${index}`}
                                          role="option"
                                          aria-selected={index === activeIndex}
                                          indicator="none"
                                          isSelected={index === activeIndex}
                                          onMouseDown={(e) =>
                                              e.preventDefault()
                                          }
                                          onMouseEnter={() => onHover(index)}
                                          onClick={() => onSelect(user)}
                                          label={
                                              <>
                                                  <Avatar
                                                      src={
                                                          user.avatar ??
                                                          undefined
                                                      }
                                                      initials={user.name.charAt(
                                                          0,
                                                      )}
                                                      size="sm"
                                                  />
                                                  <span className="truncate">
                                                      {user.name}
                                                  </span>
                                                  {(nameCounts.get(user.name) ??
                                                      0) > 1 && (
                                                      <span className="shrink-0 font-normal text-[var(--text-muted-color)]">
                                                          #{user.id}
                                                      </span>
                                                  )}
                                              </>
                                          }
                                      />
                                  ))}
                        </div>
                    )}
                </DropdownPanel>,
                document.body,
            )}
            {activeIssue &&
                cardAnchor &&
                createPortal(
                    <IssuePreviewCard
                        issue={toPreviewIssue(activeIssue)}
                        anchorRect={cardAnchor}
                        placement="top"
                    />,
                    document.body,
                )}
        </>
    );
}
