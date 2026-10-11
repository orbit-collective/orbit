/**
 * Lets any page header open the command palette without importing its
 * context: the provider listens for this once, so PageHeader stays usable
 * (and testable) on pages and in tests that have no palette mounted.
 */
export const OPEN_COMMAND_PALETTE_EVENT = 'orbit:open-command-palette';

export const requestOpenCommandPalette = (): void => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT));
};
