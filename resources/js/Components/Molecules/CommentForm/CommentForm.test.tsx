import { AssignableUser } from '@/types/Users';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import CommentForm from './CommentForm';

const users: AssignableUser[] = [
    { id: 1, name: 'Jane Cooper' },
    { id: 2, name: 'Bob Smith' },
];

describe('CommentForm Component', () => {
    test('renders a textarea and submit button', () => {
        render(<CommentForm onSubmit={() => {}} />);

        expect(
            screen.getByPlaceholderText('Leave a comment...'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Post comment' }),
        ).toBeInTheDocument();
    });

    test('submits the typed body and clears the field', async () => {
        const handleSubmit = vi.fn();
        render(<CommentForm onSubmit={handleSubmit} />);

        const textarea = screen.getByPlaceholderText('Leave a comment...');
        await userEvent.type(textarea, 'Nice work');
        await userEvent.click(
            screen.getByRole('button', { name: 'Post comment' }),
        );

        expect(handleSubmit).toHaveBeenCalledWith('Nice work', []);
        expect(textarea).toHaveValue('');
    });

    test('does not submit an empty or whitespace-only comment', async () => {
        const handleSubmit = vi.fn();
        render(<CommentForm onSubmit={handleSubmit} />);

        await userEvent.type(
            screen.getByPlaceholderText('Leave a comment...'),
            '   ',
        );
        expect(
            screen.getByRole('button', { name: 'Post comment' }),
        ).toBeDisabled();
    });

    test('guards against a direct form submit with a whitespace-only body', () => {
        const handleSubmit = vi.fn();
        render(<CommentForm onSubmit={handleSubmit} />);

        const textarea = screen.getByPlaceholderText('Leave a comment...');
        fireEvent.change(textarea, { target: { value: '   ' } });
        fireEvent.submit(textarea.closest('form') as HTMLFormElement);

        expect(handleSubmit).not.toHaveBeenCalled();
    });

    test('disables the textarea and submit button while submitting', () => {
        render(<CommentForm onSubmit={() => {}} isSubmitting />);

        expect(
            screen.getByPlaceholderText('Leave a comment...'),
        ).toBeDisabled();
        expect(
            screen.getByRole('button', { name: 'Post comment' }),
        ).toBeDisabled();
    });

    test('shows filtered mention suggestions when typing @', async () => {
        render(<CommentForm onSubmit={() => {}} users={users} />);

        await userEvent.type(
            screen.getByPlaceholderText('Leave a comment...'),
            'Hi @jane',
        );

        expect(screen.getByText('Jane Cooper')).toBeInTheDocument();
        expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    });

    test('selecting a mention inserts the name and includes it on submit', async () => {
        const handleSubmit = vi.fn();
        render(<CommentForm onSubmit={handleSubmit} users={users} />);

        const textarea = screen.getByPlaceholderText('Leave a comment...');
        await userEvent.type(textarea, 'Hi @jane');
        await userEvent.click(screen.getByText('Jane Cooper'));

        expect(textarea).toHaveValue('Hi @Jane Cooper ');

        await userEvent.click(
            screen.getByRole('button', { name: 'Post comment' }),
        );

        expect(handleSubmit).toHaveBeenCalledWith('Hi @[Jane Cooper](1) ', [1]);
    });

    test('typing a duplicate name after selecting a mention does not corrupt it', async () => {
        // Two members named "Jane Cooper" - picking one, then typing more
        // text that also happens to say "Jane Cooper" elsewhere must not
        // make the original mention resolve to the wrong id.
        const duplicateNamed: AssignableUser[] = [
            { id: 1, name: 'Jane Cooper' },
            { id: 9, name: 'Jane Cooper' },
        ];
        const handleSubmit = vi.fn();
        render(<CommentForm onSubmit={handleSubmit} users={duplicateNamed} />);

        const textarea = screen.getByPlaceholderText('Leave a comment...');
        await userEvent.type(textarea, 'Hi @jane');
        await userEvent.click(screen.getAllByText('Jane Cooper')[0]);
        await userEvent.type(textarea, 'thanks Jane Cooper');

        await userEvent.click(
            screen.getByRole('button', { name: 'Post comment' }),
        );

        expect(handleSubmit).toHaveBeenCalledWith(
            'Hi @[Jane Cooper](1) thanks Jane Cooper',
            [1],
        );
    });

    test('deleting a selected mention drops it from the submitted mentions', async () => {
        const handleSubmit = vi.fn();
        render(<CommentForm onSubmit={handleSubmit} users={users} />);

        const textarea = screen.getByPlaceholderText('Leave a comment...');
        await userEvent.type(textarea, 'Hi @jane');
        await userEvent.click(screen.getByText('Jane Cooper'));
        expect(textarea).toHaveValue('Hi @Jane Cooper ');

        // Backspace into the middle of the inserted mention text.
        textarea.focus();
        (textarea as HTMLTextAreaElement).setSelectionRange(11, 11);
        await userEvent.keyboard('{Backspace}{Backspace}');

        await userEvent.click(
            screen.getByRole('button', { name: 'Post comment' }),
        );

        expect(handleSubmit).toHaveBeenCalledWith(expect.any(String), []);
    });

    test('drops tracked mentions instead of misattributing them when a change bypasses keydown/paste/cut', async () => {
        // Regression test: an edit that isn't preceded by a captured
        // keydown/paste/cut (IME composition, drag-and-drop, browser
        // undo/redo, autocomplete) must not reuse a stale edit range from an
        // earlier keystroke - it should drop tracked mentions rather than
        // risk shifting one to the wrong position.
        const handleSubmit = vi.fn();
        render(<CommentForm onSubmit={handleSubmit} users={users} />);

        const textarea = screen.getByPlaceholderText(
            'Leave a comment...',
        ) as HTMLTextAreaElement;

        await userEvent.type(textarea, 'Hi @jane');
        await userEvent.click(screen.getByText('Jane Cooper'));
        expect(textarea).toHaveValue('Hi @Jane Cooper ');

        // Simulates a change with no preceding keydown/paste/cut capture.
        fireEvent.change(textarea, {
            target: { value: 'Hi @Jane Cooper thanks a lot' },
        });

        await userEvent.click(
            screen.getByRole('button', { name: 'Post comment' }),
        );

        expect(handleSubmit).toHaveBeenCalledWith(
            'Hi @Jane Cooper thanks a lot',
            [],
        );
    });

    test('inserting a mention before an already-selected one keeps both intact', async () => {
        // Regression test: selectMention must reconcile existing ranges
        // against its own insertion, the same way handleChange does for
        // ordinary typing - otherwise a mention inserted earlier in the
        // text leaves every later mention's tracked offset stale.
        const handleSubmit = vi.fn();
        render(<CommentForm onSubmit={handleSubmit} users={users} />);

        const textarea = screen.getByPlaceholderText(
            'Leave a comment...',
        ) as HTMLTextAreaElement;

        await userEvent.type(textarea, '@b');
        await userEvent.click(screen.getByText('Bob Smith'));
        expect(textarea).toHaveValue('@Bob Smith ');

        textarea.focus();
        textarea.setSelectionRange(0, 0);
        await userEvent.keyboard('@jane');
        await userEvent.click(screen.getByText('Jane Cooper'));
        expect(textarea).toHaveValue('@Jane Cooper @Bob Smith ');

        await userEvent.click(
            screen.getByRole('button', { name: 'Post comment' }),
        );

        expect(handleSubmit).toHaveBeenCalledWith(
            '@[Jane Cooper](1) @[Bob Smith](2) ',
            expect.arrayContaining([1, 2]),
        );
        expect(handleSubmit.mock.calls[0][1]).toHaveLength(2);
    });

    test('selecting a mention with the keyboard works the same way', async () => {
        const handleSubmit = vi.fn();
        render(<CommentForm onSubmit={handleSubmit} users={users} />);

        const textarea = screen.getByPlaceholderText('Leave a comment...');
        await userEvent.type(textarea, 'Hi @b');
        await userEvent.keyboard('{Enter}');

        expect(textarea).toHaveValue('Hi @Bob Smith ');

        await userEvent.click(
            screen.getByRole('button', { name: 'Post comment' }),
        );

        expect(handleSubmit).toHaveBeenCalledWith('Hi @[Bob Smith](2) ', [2]);
    });

    test('closes the mention menu on Escape without inserting anything', async () => {
        render(<CommentForm onSubmit={() => {}} users={users} />);

        await userEvent.type(
            screen.getByPlaceholderText('Leave a comment...'),
            'Hi @jane',
        );
        expect(screen.getByText('Jane Cooper')).toBeInTheDocument();

        await userEvent.keyboard('{Escape}');

        expect(screen.queryByText('Jane Cooper')).not.toBeInTheDocument();
    });

    test('does not treat a mid-word "@" (e.g. an email) as a mention', async () => {
        render(<CommentForm onSubmit={() => {}} users={users} />);

        await userEvent.type(
            screen.getByPlaceholderText('Leave a comment...'),
            'foo@jane',
        );

        expect(screen.queryByText('Jane Cooper')).not.toBeInTheDocument();
    });
});

const imageFile = (name = 'shot.png') =>
    new File(['x'], name, { type: 'image/png' });

const transfer = (files: File[]) =>
    ({ files, items: [] }) as unknown as DataTransfer;

describe('CommentForm image uploads', () => {
    test('pasting an image uploads it and submits the markdown link', async () => {
        const onImageUpload = vi.fn().mockResolvedValue('/storage/a.png');
        const handleSubmit = vi.fn();
        render(
            <CommentForm
                onSubmit={handleSubmit}
                onImageUpload={onImageUpload}
            />,
        );

        const textarea = screen.getByPlaceholderText(
            'Leave a comment...',
        ) as HTMLTextAreaElement;

        await userEvent.type(textarea, 'Look: ');
        fireEvent.paste(textarea, { clipboardData: transfer([imageFile()]) });

        expect(onImageUpload).toHaveBeenCalledWith(expect.any(File));
        await waitFor(() =>
            expect(textarea).toHaveValue('Look: ![shot.png](/storage/a.png)'),
        );

        await userEvent.click(
            screen.getByRole('button', { name: 'Post comment' }),
        );

        expect(handleSubmit).toHaveBeenCalledWith(
            'Look: ![shot.png](/storage/a.png)',
            [],
        );
    });

    test('pasting an image before an existing mention keeps that mention intact', async () => {
        // Regression test: the insertion happens outside handleChange, so it
        // has to reconcile the tracked mention ranges itself via
        // applyRangeEdit - otherwise every mention after the pasted image
        // keeps a stale offset and the comment notifies the wrong person.
        const onImageUpload = vi.fn().mockResolvedValue('/storage/a.png');
        const handleSubmit = vi.fn();
        render(
            <CommentForm
                onSubmit={handleSubmit}
                users={users}
                onImageUpload={onImageUpload}
            />,
        );

        const textarea = screen.getByPlaceholderText(
            'Leave a comment...',
        ) as HTMLTextAreaElement;

        await userEvent.type(textarea, '@jane');
        await userEvent.click(screen.getByText('Jane Cooper'));
        expect(textarea).toHaveValue('@Jane Cooper ');

        textarea.focus();
        textarea.setSelectionRange(0, 0);
        fireEvent.paste(textarea, { clipboardData: transfer([imageFile()]) });

        await waitFor(() =>
            expect(textarea).toHaveValue(
                '![shot.png](/storage/a.png)@Jane Cooper ',
            ),
        );

        await userEvent.click(
            screen.getByRole('button', { name: 'Post comment' }),
        );

        expect(handleSubmit).toHaveBeenCalledWith(
            '![shot.png](/storage/a.png)@[Jane Cooper](1) ',
            [1],
        );
    });

    test('pasting several images at once keeps them in order', async () => {
        // Regression test: a batch used to upload in parallel with every file
        // splicing into the original range, which inserted them backwards and,
        // over a selection, let a later file cut through the markdown of an
        // earlier one.
        const onImageUpload = vi
            .fn()
            .mockResolvedValueOnce('/storage/1.png')
            .mockResolvedValueOnce('/storage/2.png');
        const handleSubmit = vi.fn();
        render(
            <CommentForm
                onSubmit={handleSubmit}
                onImageUpload={onImageUpload}
            />,
        );

        const textarea = screen.getByPlaceholderText(
            'Leave a comment...',
        ) as HTMLTextAreaElement;

        await userEvent.type(textarea, 'Both: ');
        fireEvent.paste(textarea, {
            clipboardData: transfer([
                imageFile('one.png'),
                imageFile('two.png'),
            ]),
        });

        await waitFor(() =>
            expect(textarea).toHaveValue(
                'Both: ![one.png](/storage/1.png)![two.png](/storage/2.png)',
            ),
        );
    });

    test('pasting several images over a selection replaces it once', async () => {
        const onImageUpload = vi
            .fn()
            .mockResolvedValueOnce('/storage/1.png')
            .mockResolvedValueOnce('/storage/2.png');
        render(
            <CommentForm onSubmit={vi.fn()} onImageUpload={onImageUpload} />,
        );

        const textarea = screen.getByPlaceholderText(
            'Leave a comment...',
        ) as HTMLTextAreaElement;

        await userEvent.type(textarea, 'drop me tail');
        textarea.setSelectionRange(0, 8);
        fireEvent.paste(textarea, {
            clipboardData: transfer([
                imageFile('one.png'),
                imageFile('two.png'),
            ]),
        });

        await waitFor(() =>
            expect(textarea).toHaveValue(
                '![one.png](/storage/1.png)![two.png](/storage/2.png)tail',
            ),
        );
    });

    test('a failed upload does not stop the rest of the batch', async () => {
        const onImageUpload = vi
            .fn()
            .mockRejectedValueOnce(new Error('nope'))
            .mockResolvedValueOnce('/storage/2.png');
        render(
            <CommentForm onSubmit={vi.fn()} onImageUpload={onImageUpload} />,
        );

        const textarea = screen.getByPlaceholderText(
            'Leave a comment...',
        ) as HTMLTextAreaElement;

        fireEvent.paste(textarea, {
            clipboardData: transfer([
                imageFile('one.png'),
                imageFile('two.png'),
            ]),
        });

        await waitFor(() =>
            expect(textarea).toHaveValue('![two.png](/storage/2.png)'),
        );
    });

    test('dropping an image inserts it at the caret', async () => {
        const onImageUpload = vi.fn().mockResolvedValue('/storage/b.png');
        render(
            <CommentForm onSubmit={vi.fn()} onImageUpload={onImageUpload} />,
        );

        const textarea = screen.getByPlaceholderText(
            'Leave a comment...',
        ) as HTMLTextAreaElement;

        await userEvent.type(textarea, 'End');
        textarea.setSelectionRange(0, 0);
        fireEvent.drop(textarea, {
            dataTransfer: transfer([imageFile('dropped.png')]),
        });

        await waitFor(() =>
            expect(textarea).toHaveValue('![dropped.png](/storage/b.png)End'),
        );
    });

    test('a paste is left to the browser when there is no uploader', () => {
        render(<CommentForm onSubmit={vi.fn()} />);

        const textarea = screen.getByPlaceholderText('Leave a comment...');
        const event = new Event('paste', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'clipboardData', {
            value: transfer([imageFile()]),
        });
        fireEvent(textarea, event);

        expect(event.defaultPrevented).toBe(false);
    });

    test('a paste carrying no image is left to the browser', () => {
        const onImageUpload = vi.fn();
        render(
            <CommentForm onSubmit={vi.fn()} onImageUpload={onImageUpload} />,
        );

        const textarea = screen.getByPlaceholderText('Leave a comment...');
        const event = new Event('paste', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'clipboardData', {
            value: transfer([]),
        });
        fireEvent(textarea, event);

        expect(event.defaultPrevented).toBe(false);
        expect(onImageUpload).not.toHaveBeenCalled();
    });
});
