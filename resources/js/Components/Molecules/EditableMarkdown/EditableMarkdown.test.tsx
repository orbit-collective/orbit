import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import EditableMarkdown from './EditableMarkdown';

type PasteHandler = (view: unknown, event: ClipboardEvent) => boolean;

type EditorOptions = {
    content: string;
    onBlur?: (args: { editor: FakeEditor }) => void;
    editorProps?: { handlePaste?: PasteHandler };
};

class FakeEditor {
    markdown: string;
    editable = false;
    onBlur?: (args: { editor: FakeEditor }) => void;
    setEditable = vi.fn((value: boolean) => {
        this.editable = value;
    });
    focus = vi.fn();
    setContent = vi.fn((value: string) => {
        this.markdown = value;
    });
    commands = {
        focus: this.focus,
        setContent: this.setContent,
    };
    storage = {
        markdown: {
            getMarkdown: () => this.markdown,
        },
    };
    insertContentAt = vi.fn();
    chain = () => ({
        focus: () => ({
            insertContentAt: (position: number, content: unknown) => {
                this.insertContentAt(position, content);

                return { run: () => true };
            },
        }),
    });
    state = {
        selection: { to: 3 },
        doc: { content: { size: 100 } },
    };
    view = {
        posAtCoords: vi.fn(() => ({ pos: 7 })),
    };

    constructor(options: EditorOptions) {
        this.markdown = options.content;
        this.onBlur = options.onBlur;
    }
}

const mockUseEditor = vi.hoisted(() => vi.fn());

vi.mock('@tiptap/react', () => ({
    useEditor: (options: EditorOptions) => mockUseEditor(options),
    // Stands in for the rendered document: text, plus an <img> for every
    // markdown image link, which is what the real Image extension renders and
    // what the click-to-open handler looks for.
    EditorContent: ({ editor }: { editor: FakeEditor | null }) => (
        <div data-testid="editor-content" data-editable={editor?.editable}>
            {editor?.markdown}
            {[
                ...(editor?.markdown ?? '').matchAll(
                    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
                ),
            ].map(([, alt, src], index) => (
                <img key={index} src={src} alt={alt} />
            ))}
        </div>
    ),
}));

vi.mock('@tiptap/starter-kit', () => ({
    default: { configure: () => ({}) },
}));
vi.mock('@tiptap/extension-placeholder', () => ({
    default: { configure: () => ({}) },
}));
vi.mock('@tiptap/extension-task-list', () => ({ default: {} }));
vi.mock('@tiptap/extension-task-item', () => ({
    default: { configure: () => ({}) },
}));
vi.mock('@tiptap/extension-table', () => ({ TableKit: {} }));
vi.mock('@tiptap/extension-image', () => ({ default: {} }));
vi.mock('tiptap-markdown', () => ({
    Markdown: { configure: () => ({}) },
}));

const setup = (
    value: string,
    onSave = vi.fn(),
    disabled = false,
    onImageUpload?: (file: File) => Promise<string>,
) => {
    // Real TipTap memoizes a single Editor instance across re-renders, so the
    // mock must too — otherwise clicking (which triggers a state update and
    // therefore a re-render) would silently swap in a fresh, never-called
    // instance right after the click handler ran.
    const editor = new FakeEditor({ content: value });
    let handlePaste: PasteHandler | undefined;
    mockUseEditor.mockImplementation((options: EditorOptions) => {
        editor.onBlur = options.onBlur;
        handlePaste = options.editorProps?.handlePaste;
        return editor;
    });

    const utils = render(
        <EditableMarkdown
            value={value}
            onSave={onSave}
            disabled={disabled}
            onImageUpload={onImageUpload}
        />,
    );

    return {
        ...utils,
        onSave,
        getEditor: () => editor,
        paste: (event: Partial<ClipboardEvent>) =>
            handlePaste?.(null, event as ClipboardEvent) ?? false,
    };
};

const imageFile = (name = 'shot.png') =>
    new File(['x'], name, { type: 'image/png' });

const transfer = (files: File[]) =>
    ({ files, items: [] }) as unknown as DataTransfer;

describe('EditableMarkdown Component', () => {
    test('renders the editor content initialized with the current value', () => {
        setup('# Hello');

        expect(screen.getByTestId('editor-content')).toHaveTextContent(
            '# Hello',
        );
    });

    test('clicking the container makes the editor editable and focuses the end', async () => {
        const { getEditor } = setup('Some text');

        await userEvent.click(screen.getByTestId('editor-content'));

        const editor = getEditor();
        expect(editor.setEditable).toHaveBeenCalledWith(true);
        expect(editor.focus).toHaveBeenCalledWith('end');
    });

    test('clicking again while already editing does not re-trigger setEditable', async () => {
        const { getEditor } = setup('Some text');

        const container = screen.getByTestId('editor-content');
        await userEvent.click(container);
        const editor = getEditor();
        editor.setEditable.mockClear();
        editor.focus.mockClear();

        await userEvent.click(container);

        expect(editor.setEditable).not.toHaveBeenCalled();
        expect(editor.focus).not.toHaveBeenCalled();
    });

    test('does not start editing when disabled', async () => {
        const { getEditor } = setup('Some text', vi.fn(), true);

        await userEvent.click(screen.getByTestId('editor-content'));

        expect(getEditor().setEditable).not.toHaveBeenCalled();
    });

    test('committing on blur calls onSave when the markdown changed', () => {
        const onSave = vi.fn();
        const { getEditor } = setup('Old text', onSave);
        const editor = getEditor();

        editor.setContent('New text');
        editor.onBlur?.({ editor });

        expect(editor.setEditable).toHaveBeenCalledWith(false);
        expect(onSave).toHaveBeenCalledWith('New text');
    });

    test('does not call onSave on blur when the markdown is unchanged', () => {
        const onSave = vi.fn();
        const { getEditor } = setup('Same text', onSave);
        const editor = getEditor();

        editor.onBlur?.({ editor });

        expect(onSave).not.toHaveBeenCalled();
    });

    test('pasting an image uploads it and inserts it at the caret', async () => {
        const onImageUpload = vi.fn().mockResolvedValue('/storage/a.png');
        const preventDefault = vi.fn();
        const file = imageFile();
        const { getEditor, paste } = setup(
            'Text',
            vi.fn(),
            false,
            onImageUpload,
        );

        const handled = paste({
            preventDefault,
            clipboardData: transfer([file]),
        });

        expect(handled).toBe(true);
        expect(preventDefault).toHaveBeenCalled();
        await waitFor(() =>
            expect(getEditor().insertContentAt).toHaveBeenCalledWith(3, {
                type: 'image',
                attrs: { src: '/storage/a.png', alt: 'shot.png' },
            }),
        );
    });

    test('a filename that would break the markdown link is sanitized', async () => {
        const onImageUpload = vi.fn().mockResolvedValue('/storage/a.png');
        const { getEditor, paste } = setup(
            'Text',
            vi.fn(),
            false,
            onImageUpload,
        );

        paste({
            preventDefault: vi.fn(),
            clipboardData: transfer([imageFile('screen](old).png')]),
        });

        await waitFor(() =>
            expect(getEditor().insertContentAt).toHaveBeenCalledWith(3, {
                type: 'image',
                attrs: { src: '/storage/a.png', alt: 'screenold.png' },
            }),
        );
    });

    test('pasting is left to TipTap when there is no uploader or no image', () => {
        const withoutUploader = setup('Text');

        expect(
            withoutUploader.paste({
                preventDefault: vi.fn(),
                clipboardData: transfer([imageFile()]),
            }),
        ).toBe(false);

        cleanup();

        const withUploader = setup('Text', vi.fn(), false, vi.fn());

        expect(
            withUploader.paste({
                preventDefault: vi.fn(),
                clipboardData: transfer([]),
            }),
        ).toBe(false);
    });

    test('a failed upload is swallowed and nothing is inserted', async () => {
        const onImageUpload = vi.fn().mockRejectedValue(new Error('nope'));
        const { getEditor, paste } = setup(
            'Text',
            vi.fn(),
            false,
            onImageUpload,
        );

        paste({
            preventDefault: vi.fn(),
            clipboardData: transfer([imageFile()]),
        });

        await waitFor(() => expect(onImageUpload).toHaveBeenCalled());
        expect(getEditor().insertContentAt).not.toHaveBeenCalled();
    });

    test('dropping an image starts editing and inserts it at the drop position', async () => {
        const onImageUpload = vi.fn().mockResolvedValue('/storage/b.png');
        const { getEditor } = setup('Text', vi.fn(), false, onImageUpload);

        fireEvent.drop(screen.getByTestId('editor-content'), {
            dataTransfer: transfer([imageFile('dropped.png')]),
        });

        const editor = getEditor();
        expect(editor.setEditable).toHaveBeenCalledWith(true);
        await waitFor(() =>
            expect(editor.insertContentAt).toHaveBeenCalledWith(7, {
                type: 'image',
                attrs: { src: '/storage/b.png', alt: 'dropped.png' },
            }),
        );
    });

    test('dropping an image while disabled does nothing', () => {
        const onImageUpload = vi.fn();
        const { getEditor } = setup('Text', vi.fn(), true, onImageUpload);

        fireEvent.drop(screen.getByTestId('editor-content'), {
            dataTransfer: transfer([imageFile()]),
        });

        expect(onImageUpload).not.toHaveBeenCalled();
        expect(getEditor().setEditable).not.toHaveBeenCalled();
    });

    test('blurring while an upload is in flight does not end the edit', async () => {
        let resolveUpload: (url: string) => void = () => {};
        const onImageUpload = vi.fn(
            () => new Promise<string>((resolve) => (resolveUpload = resolve)),
        );
        const onSave = vi.fn();
        const { getEditor, paste } = setup(
            'Text',
            onSave,
            false,
            onImageUpload,
        );
        const editor = getEditor();

        paste({
            preventDefault: vi.fn(),
            clipboardData: transfer([imageFile()]),
        });
        await screen.findByText('Uploading 1 image...');

        editor.setContent('Changed');
        editor.onBlur?.({ editor });

        expect(onSave).not.toHaveBeenCalled();

        resolveUpload('/storage/c.png');
        await waitFor(() => expect(editor.insertContentAt).toHaveBeenCalled());

        editor.onBlur?.({ editor });
        expect(onSave).toHaveBeenCalledWith('Changed');
    });

    test('pressing Escape cancels the edit and reverts the content', () => {
        const onSave = vi.fn();
        const { getEditor } = setup('Original', onSave);
        const editor = getEditor();

        editor.setContent('Changed but not saved');
        fireEvent.keyDown(screen.getByTestId('editor-content'), {
            key: 'Escape',
        });

        expect(editor.setContent).toHaveBeenCalledWith('Original');
        expect(editor.setEditable).toHaveBeenCalledWith(false);
        expect(onSave).not.toHaveBeenCalled();
    });
});

describe('EditableMarkdown image clicks', () => {
    test('clicking a rendered image opens it in a new tab instead of editing', async () => {
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
        const { getEditor } = setup('Look ![shot.png](/storage/a.png)');

        await userEvent.click(screen.getByRole('img', { name: 'shot.png' }));

        expect(openSpy).toHaveBeenCalledWith(
            expect.stringContaining('/storage/a.png'),
            '_blank',
            'noopener,noreferrer',
        );
        expect(getEditor().setEditable).not.toHaveBeenCalled();
    });

    test('clicking the text around an image still starts editing', async () => {
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
        const { getEditor } = setup('Look ![shot.png](/storage/a.png)');

        await userEvent.click(screen.getByText(/Look/));

        expect(openSpy).not.toHaveBeenCalled();
        expect(getEditor().setEditable).toHaveBeenCalledWith(true);
    });

    test('clicking an image while editing does not open a tab', async () => {
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
        setup('Look ![shot.png](/storage/a.png)');

        await userEvent.click(screen.getByText(/Look/));
        openSpy.mockClear();

        await userEvent.click(screen.getByRole('img', { name: 'shot.png' }));

        expect(openSpy).not.toHaveBeenCalled();
    });
});
