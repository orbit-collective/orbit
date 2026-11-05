import { fireEvent, screen } from '@testing-library/react';
import { ReactElement } from 'react';
import { expect } from 'vitest';
import { SettingsSectionsProvider } from '@/context/SettingsSectionsContext';

/** Renders a tab the way a settings page does, so its foldable panels work. */
export const inSettingsPage = (ui: ReactElement, tabId = 'test-tab') => (
    <SettingsSectionsProvider storageKey={`settings-sections:${tabId}`}>
        {ui}
    </SettingsSectionsProvider>
);

/**
 * Each named panel has a header that folds it and unfolds it again, reporting
 * its state with aria-expanded.
 */
export function expectPanelsToFold(names: Array<string | RegExp>) {
    names.forEach((name) => {
        const header = screen.getByRole('button', { name });
        expect(header).toHaveAttribute('aria-expanded', 'true');

        fireEvent.click(header);
        expect(header).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(header);
        expect(header).toHaveAttribute('aria-expanded', 'true');
    });
}
