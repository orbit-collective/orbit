import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InlineSelectDropdown from './InlineSelectDropdown';

const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
];

function setup(value: string | null = null) {
    const onChange = vi.fn();
    render(
        <InlineSelectDropdown
            label="Field"
            placeholder="Pick"
            options={options}
            value={value}
            onChange={onChange}
        />,
    );
    return { onChange, trigger: screen.getByRole('button', { name: 'Field' }) };
}

describe('InlineSelectDropdown keyboard', () => {
    it('opens with ArrowDown and focuses the first option', () => {
        const { trigger } = setup();
        fireEvent.keyDown(trigger, { key: 'ArrowDown' });
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('option', { name: 'Alpha' })).toHaveFocus();
    });

    it('focuses the selected option and moves with arrows', () => {
        const { trigger } = setup('b');
        fireEvent.click(trigger);
        const beta = screen.getByRole('option', { name: 'Beta' });
        expect(beta).toHaveFocus();
        fireEvent.keyDown(beta, { key: 'ArrowDown' });
        expect(screen.getByRole('option', { name: 'Gamma' })).toHaveFocus();
    });

    it('closes on Escape and returns focus to the trigger', () => {
        const { trigger } = setup();
        fireEvent.click(trigger);
        fireEvent.keyDown(screen.getByRole('option', { name: 'Alpha' }), {
            key: 'Escape',
        });
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });

    it('selects via click and restores focus', () => {
        const { trigger, onChange } = setup();
        fireEvent.click(trigger);
        fireEvent.click(screen.getByRole('option', { name: 'Beta' }));
        expect(onChange).toHaveBeenCalledWith('b');
        expect(trigger).toHaveFocus();
    });
});
