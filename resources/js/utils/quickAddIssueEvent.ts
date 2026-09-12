/**
 * Tiny decoupled event bus so MainLayout's global "New issue" keyboard
 * shortcut/header button can ask whichever IssueTable is currently mounted
 * (if any - board/calendar/activity views don't render one) to reveal and
 * focus its inline quick-add row, without prop-drilling a ref across the
 * layout boundary. A no-op when no IssueTable is listening.
 */
export const QUICK_ADD_ISSUE_EVENT = 'orbit:quick-add-issue';

export const requestQuickAddIssue = (): void => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(QUICK_ADD_ISSUE_EVENT));
};
