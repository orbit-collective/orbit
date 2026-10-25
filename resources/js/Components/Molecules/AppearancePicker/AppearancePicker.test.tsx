import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import AppearancePicker from './AppearancePicker';

const palette = ['#f44336', '#2196f3'] as const;

const renderPicker = (
    props: Partial<Parameters<typeof AppearancePicker>[0]> = {},
) => {
    const onColorChange = vi.fn();
    render(
        <AppearancePicker
            color="#f44336"
            onColorChange={onColorChange}
            palette={palette}
            ariaLabel="Pick the look"
            {...props}
        >
            <span>thing</span>
        </AppearancePicker>,
    );

    return { onColorChange };
};

describe('AppearancePicker', () => {
    test('the thing itself is the trigger and stays closed until clicked', () => {
        renderPicker();

        expect(screen.getByText('thing')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Use color #2196f3' }),
        ).not.toBeInTheDocument();
    });

    test('offers the palette and reports the chosen color', async () => {
        const user = userEvent.setup();
        const { onColorChange } = renderPicker();

        await user.click(screen.getByRole('button', { name: 'Pick the look' }));
        await user.click(
            screen.getByRole('button', { name: 'Use color #2196f3' }),
        );

        expect(onColorChange).toHaveBeenCalledWith('#2196f3');
    });

    test('marks the current color as pressed', async () => {
        const user = userEvent.setup();
        renderPicker();

        await user.click(screen.getByRole('button', { name: 'Pick the look' }));

        expect(
            screen.getByRole('button', { name: 'Use color #f44336' }),
        ).toHaveAttribute('aria-pressed', 'true');
        expect(
            screen.getByRole('button', { name: 'Use color #2196f3' }),
        ).toHaveAttribute('aria-pressed', 'false');
    });

    test('opens up to a full picker for a color the palette lacks', async () => {
        const user = userEvent.setup();
        const { onColorChange } = renderPicker();

        await user.click(screen.getByRole('button', { name: 'Pick the look' }));
        await user.click(screen.getByRole('button', { name: 'More colors' }));
        const hex = screen.getByLabelText('Hex color');
        await user.clear(hex);
        await user.type(hex, '#00aa99');

        expect(onColorChange).toHaveBeenLastCalledWith('#00aa99');
    });

    test('offers no icons unless asked to', async () => {
        const user = userEvent.setup();
        renderPicker();

        await user.click(screen.getByRole('button', { name: 'Pick the look' }));

        expect(
            screen.queryByRole('button', { name: /^Use icon/ }),
        ).not.toBeInTheDocument();
    });

    test('with icons it lists them, marks the current one and reports a pick', async () => {
        const user = userEvent.setup();
        const onIconChange = vi.fn();
        renderPicker({
            icon: 'Flag',
            onIconChange,
            iconOptions: ['Flag', 'Flame'],
        });

        await user.click(screen.getByRole('button', { name: 'Pick the look' }));

        expect(
            screen.getByRole('button', { name: 'Use icon Flag' }),
        ).toHaveAttribute('aria-pressed', 'true');

        await user.click(
            screen.getByRole('button', { name: 'Use icon Flame' }),
        );

        expect(onIconChange).toHaveBeenCalledWith('Flame');
    });
});
