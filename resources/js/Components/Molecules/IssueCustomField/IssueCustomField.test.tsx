import { IssueTypeField } from '@/types/IssueTypes';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import IssueCustomField from './IssueCustomField';

const makeField = (
    overrides: Partial<IssueTypeField> = {},
): IssueTypeField => ({
    id: 1,
    issueTypeId: 1,
    label: 'Environment',
    type: 'text',
    options: [],
    placeholder: null,
    isRequired: false,
    ...overrides,
});

describe('IssueCustomField', () => {
    beforeEach(() => vi.clearAllMocks());

    test('a checkbox field saves the new checked state', () => {
        const onSave = vi.fn();
        render(
            <IssueCustomField
                field={makeField({ type: 'checkbox', label: 'Regression' })}
                value={false}
                onSave={onSave}
            />,
        );

        fireEvent.click(screen.getByRole('checkbox'));

        expect(onSave).toHaveBeenCalledWith(true);
    });

    test('a choice field saves the option that was picked', () => {
        const onSave = vi.fn();
        render(
            <IssueCustomField
                field={makeField({
                    type: 'select',
                    label: 'Severity',
                    options: ['Low', 'High'],
                })}
                value={null}
                onSave={onSave}
            />,
        );

        fireEvent.click(screen.getByText('High'));

        expect(onSave).toHaveBeenCalledWith('High');
    });

    test('clicking the already-selected choice clears it', () => {
        const onSave = vi.fn();
        render(
            <IssueCustomField
                field={makeField({
                    type: 'select',
                    options: ['Low', 'High'],
                })}
                value="High"
                onSave={onSave}
            />,
        );

        fireEvent.click(screen.getByText('High'));

        expect(onSave).toHaveBeenCalledWith(null);
    });

    test('a number field saves on blur', () => {
        const onSave = vi.fn();
        render(
            <IssueCustomField
                field={makeField({ type: 'number', label: 'Story points' })}
                value={null}
                onSave={onSave}
            />,
        );

        const input = screen.getByLabelText('Story points');
        fireEvent.change(input, { target: { value: '5' } });
        fireEvent.blur(input);

        expect(onSave).toHaveBeenCalledWith('5');
    });

    test('clearing a number field saves null rather than an empty string', () => {
        const onSave = vi.fn();
        render(
            <IssueCustomField
                field={makeField({ type: 'number', label: 'Story points' })}
                value={5}
                onSave={onSave}
            />,
        );

        const input = screen.getByLabelText('Story points');
        fireEvent.change(input, { target: { value: '' } });
        fireEvent.blur(input);

        expect(onSave).toHaveBeenCalledWith(null);
    });

    test('a text field shows its placeholder as the empty state', () => {
        render(
            <IssueCustomField
                field={makeField({ placeholder: 'Which browser?' })}
                value={null}
                onSave={vi.fn()}
            />,
        );

        expect(screen.getByText('Which browser?')).toBeInTheDocument();
    });
});
