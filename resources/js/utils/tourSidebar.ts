/**
 * Lets the product tour open the mobile sidebar drawer on steps that point
 * at it. The Sidebar lives inside each page's layout and remounts on every
 * Inertia visit, so the wanted state is kept here (not in the component)
 * and read again on mount, in addition to the change event.
 */
export const TOUR_SIDEBAR_EVENT = 'orbit:tour-sidebar';

let tourSidebarOpen = false;

export const isTourSidebarOpen = (): boolean => tourSidebarOpen;

export const setTourSidebarOpen = (open: boolean): void => {
    if (tourSidebarOpen === open) return;

    tourSidebarOpen = open;
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(TOUR_SIDEBAR_EVENT));
};
