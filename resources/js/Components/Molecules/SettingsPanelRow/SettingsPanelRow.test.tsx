import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from './SettingsPanelRow';

describe('SettingsPanelRow', () => {
    test('shows its title, description, action and content', () => {
        render(
            <SettingsPanelRow
                title="Mentions"
                description="When someone mentions you"
                action={<button>Edit</button>}
            >
                <p>extra</p>
            </SettingsPanelRow>,
        );

        expect(screen.getByText('Mentions')).toBeInTheDocument();
        expect(
            screen.getByText('When someone mentions you'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Edit' }),
        ).toBeInTheDocument();
        expect(screen.getByText('extra')).toBeInTheDocument();
    });

    test('works without a description or an action', () => {
        render(<SettingsPanelRow title="Plain" />);

        expect(screen.getByText('Plain')).toBeInTheDocument();
    });

    test('rows of a panel rise in and end up visible', async () => {
        render(
            <SettingsPanel title="Panel">
                <SettingsPanelRow title="One" />
                <SettingsPanelRow title="Two" />
                <SettingsPanelRow title="Three" />
            </SettingsPanel>,
        );

        await waitFor(() => {
            ['One', 'Two', 'Three'].forEach((title) =>
                expect(screen.getByText(title)).toBeVisible(),
            );
        });
    });

    test('a row added later joins in and also ends up visible', async () => {
        function Growing() {
            const [more, setMore] = useState(false);

            return (
                <SettingsPanel title="Panel">
                    <SettingsPanelRow title="First" />
                    {more && <SettingsPanelRow title="Later" />}
                    <button onClick={() => setMore(true)}>add</button>
                </SettingsPanel>
            );
        }
        render(<Growing />);

        fireEvent.click(screen.getByText('add'));

        await waitFor(() => expect(screen.getByText('Later')).toBeVisible());
    });
});
