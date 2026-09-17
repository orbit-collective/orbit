import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import EditableText from './EditableText';

describe('EditableText Component', () => {
    test('renders the value in display mode', () => {
        render(<EditableText value="Fix login crash" onSave={() => {}} />);

        expect(screen.getByText('Fix login crash')).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    test('renders placeholder text when the value is empty', () => {
        render(
            <EditableText
                value=""
                onSave={() => {}}
                placeholder="Add a description..."
            />,
        );

        expect(screen.getByText('Add a description...')).toBeInTheDocument();
    });

    test('falls back to emptyText when the value is empty and no placeholder is given', () => {
        render(<EditableText value="" onSave={() => {}} emptyText="Empty" />);

        expect(screen.getByText('Empty')).toBeInTheDocument();
    });

    test('clicking the display switches to an editable input pre-filled with the value', async () => {
        render(<EditableText value="Fix login crash" onSave={() => {}} />);

        await userEvent.click(screen.getByText('Fix login crash'));

        expect(screen.getByRole('textbox')).toHaveValue('Fix login crash');
    });

    test('committing a change on blur calls onSave with the new value', async () => {
        const handleSave = vi.fn();
        render(<EditableText value="Old title" onSave={handleSave} />);

        await userEvent.click(screen.getByText('Old title'));
        const input = screen.getByRole('textbox');
        await userEvent.clear(input);
        await userEvent.type(input, 'New title');
        await userEvent.tab();

        expect(handleSave).toHaveBeenCalledWith('New title');
    });

    test('pressing Enter commits the change for single-line fields', async () => {
        const handleSave = vi.fn();
        render(<EditableText value="Old title" onSave={handleSave} />);

        await userEvent.click(screen.getByText('Old title'));
        const input = screen.getByRole('textbox');
        await userEvent.clear(input);
        await userEvent.type(input, 'New title{Enter}');

        expect(handleSave).toHaveBeenCalledWith('New title');
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    test('pressing Escape cancels the edit without calling onSave', async () => {
        const handleSave = vi.fn();
        render(<EditableText value="Old title" onSave={handleSave} />);

        await userEvent.click(screen.getByText('Old title'));
        const input = screen.getByRole('textbox');
        await userEvent.clear(input);
        await userEvent.type(input, 'Discarded{Escape}');

        expect(handleSave).not.toHaveBeenCalled();
        expect(screen.getByText('Old title')).toBeInTheDocument();
    });

    test('does not call onSave on blur when the value is unchanged', async () => {
        const handleSave = vi.fn();
        render(<EditableText value="Same title" onSave={handleSave} />);

        await userEvent.click(screen.getByText('Same title'));
        await userEvent.tab();

        expect(handleSave).not.toHaveBeenCalled();
    });

    test('renders a textarea and does not commit on Enter when multiline', async () => {
        const handleSave = vi.fn();
        render(
            <EditableText value="Some body" onSave={handleSave} multiline />,
        );

        await userEvent.click(screen.getByText('Some body'));
        const textarea = screen.getByRole('textbox');
        expect(textarea.tagName).toBe('TEXTAREA');

        await userEvent.type(textarea, '{Enter}more text');

        expect(handleSave).not.toHaveBeenCalled();
    });

    test('pressing Escape in a multiline field cancels without calling onSave', async () => {
        const handleSave = vi.fn();
        render(<EditableText value="Old body" onSave={handleSave} multiline />);

        await userEvent.click(screen.getByText('Old body'));
        const textarea = screen.getByRole('textbox');
        await userEvent.type(textarea, '{Enter}Discarded{Escape}');

        expect(handleSave).not.toHaveBeenCalled();
        expect(screen.getByText('Old body')).toBeInTheDocument();
    });

    test('pressing Enter on the display starts editing via the keyboard', async () => {
        render(<EditableText value="Keyboard title" onSave={() => {}} />);

        screen.getByText('Keyboard title').focus();
        await userEvent.keyboard('{Enter}');

        expect(screen.getByRole('textbox')).toHaveValue('Keyboard title');
    });

    test('pressing Space on the display starts editing via the keyboard', async () => {
        render(<EditableText value="Keyboard title" onSave={() => {}} />);

        screen.getByText('Keyboard title').focus();
        await userEvent.keyboard(' ');

        expect(screen.getByRole('textbox')).toHaveValue('Keyboard title');
    });

    test('uses renderDisplay to customize the read-only rendering', () => {
        render(
            <EditableText
                value="**bold**"
                onSave={() => {}}
                renderDisplay={(value) => <strong>{value}</strong>}
            />,
        );

        const strong = screen.getByText('**bold**');
        expect(strong.tagName).toBe('STRONG');
    });

    test('does not enter edit mode when disabled', async () => {
        render(
            <EditableText value="Locked value" onSave={() => {}} disabled />,
        );

        await userEvent.click(screen.getByText('Locked value'));

        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
});

const imageFile = (name = 'shot.png') =>
    new File(['x'], name, { type: 'image/png' });

const transfer = (files: File[]) =>
    ({ files, items: [] }) as unknown as DataTransfer;

const startMultilineEdit = async (
    value: string,
    onImageUpload?: (file: File) => Promise<string>,
    onSave = vi.fn(),
) => {
    render(
        <EditableText
            value={value}
            onSave={onSave}
            multiline
            onImageUpload={onImageUpload}
        />,
    );

    await userEvent.click(screen.getByText(value));

    return { textarea: screen.getByRole('textbox'), onSave };
};

describe('EditableText image uploads', () => {
    test('pasting an image uploads it and splices the markdown at the caret', async () => {
        const onImageUpload = vi.fn().mockResolvedValue('/storage/a.png');
        const { textarea } = await startMultilineEdit('Before', onImageUpload);

        (textarea as HTMLTextAreaElement).setSelectionRange(6, 6);
        fireEvent.paste(textarea, { clipboardData: transfer([imageFile()]) });

        expect(onImageUpload).toHaveBeenCalledWith(expect.any(File));
        await waitFor(() =>
            expect(textarea).toHaveValue('Before![shot.png](/storage/a.png)'),
        );
    });

    test('pasting replaces the selected range', async () => {
        const onImageUpload = vi.fn().mockResolvedValue('/storage/a.png');
        const { textarea } = await startMultilineEdit(
            'Old text',
            onImageUpload,
        );

        (textarea as HTMLTextAreaElement).setSelectionRange(0, 3);
        fireEvent.paste(textarea, { clipboardData: transfer([imageFile()]) });

        await waitFor(() =>
            expect(textarea).toHaveValue('![shot.png](/storage/a.png) text'),
        );
    });

    test('pasting several images at once keeps them in order', async () => {
        const onImageUpload = vi
            .fn()
            .mockResolvedValueOnce('/storage/1.png')
            .mockResolvedValueOnce('/storage/2.png');
        const { textarea } = await startMultilineEdit('Both:', onImageUpload);

        (textarea as HTMLTextAreaElement).setSelectionRange(5, 5);
        fireEvent.paste(textarea, {
            clipboardData: transfer([
                imageFile('one.png'),
                imageFile('two.png'),
            ]),
        });

        await waitFor(() =>
            expect(textarea).toHaveValue(
                'Both:![one.png](/storage/1.png)![two.png](/storage/2.png)',
            ),
        );
    });

    test('dropping an image inserts it at the caret', async () => {
        const onImageUpload = vi.fn().mockResolvedValue('/storage/b.png');
        const { textarea } = await startMultilineEdit('Body', onImageUpload);

        (textarea as HTMLTextAreaElement).setSelectionRange(0, 0);
        fireEvent.drop(textarea, {
            dataTransfer: transfer([imageFile('dropped.png')]),
        });

        await waitFor(() =>
            expect(textarea).toHaveValue('![dropped.png](/storage/b.png)Body'),
        );
    });

    test('a failed upload leaves the draft untouched', async () => {
        const onImageUpload = vi.fn().mockRejectedValue(new Error('nope'));
        const { textarea } = await startMultilineEdit('Body', onImageUpload);

        fireEvent.paste(textarea, { clipboardData: transfer([imageFile()]) });

        await waitFor(() => expect(onImageUpload).toHaveBeenCalled());
        expect(textarea).toHaveValue('Body');
    });

    test('a paste without an uploader is left to the browser', async () => {
        const { textarea } = await startMultilineEdit('Body');

        const event = new Event('paste', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'clipboardData', {
            value: transfer([imageFile()]),
        });
        fireEvent(textarea, event);

        expect(event.defaultPrevented).toBe(false);
    });

    test('blurring while an upload is in flight does not commit the edit', async () => {
        let resolveUpload: (url: string) => void = () => {};
        const onImageUpload = vi.fn(
            () => new Promise<string>((resolve) => (resolveUpload = resolve)),
        );
        const onSave = vi.fn();
        const { textarea } = await startMultilineEdit(
            'Body',
            onImageUpload,
            onSave,
        );

        fireEvent.paste(textarea, { clipboardData: transfer([imageFile()]) });
        fireEvent.blur(textarea);

        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByRole('textbox')).toBeInTheDocument();

        resolveUpload('/storage/a.png');
        await waitFor(() =>
            expect(screen.getByRole('textbox')).toHaveValue(
                'Body![shot.png](/storage/a.png)',
            ),
        );

        fireEvent.blur(screen.getByRole('textbox'));

        expect(onSave).toHaveBeenCalledWith('Body![shot.png](/storage/a.png)');
    });
});
