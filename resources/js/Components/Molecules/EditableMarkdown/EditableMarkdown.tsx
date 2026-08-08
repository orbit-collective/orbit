import { EditableMarkdownProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { useEffect, useState } from 'react';
import { Markdown } from 'tiptap-markdown';

const EditableMarkdown: React.FC<EditableMarkdownProps> = ({
    value,
    onSave,
    placeholder = 'Add a description...',
    disabled = false,
    className,
}) => {
    const [isEditing, setIsEditing] = useState(false);

    const editor = useEditor({
        editable: false,
        content: value || '',
        extensions: [
            StarterKit.configure({
                link: { openOnClick: false },
            }),
            Markdown.configure({ html: false }),
            Placeholder.configure({
                placeholder,
                showOnlyWhenEditable: false,
            }),
            TaskList,
            TaskItem.configure({ nested: true }),
            TableKit,
            Image,
        ],
        editorProps: {
            attributes: {
                class: 'prose max-w-none text-sm focus:outline-none',
            },
        },
        onBlur: ({ editor }) => commit(editor),
    });

    useEffect(() => {
        if (!editor || isEditing) return;

        const current = editor.storage.markdown.getMarkdown();
        if (current !== (value || '')) {
            editor.commands.setContent(value || '');
        }
    }, [value, editor]);

    const commit = (ed: NonNullable<typeof editor>) => {
        setIsEditing(false);
        ed.setEditable(false);

        const markdown = ed.storage.markdown.getMarkdown();
        if (markdown !== (value || '')) {
            onSave(markdown);
        }
    };

    const cancel = () => {
        if (!editor) return;

        editor.commands.setContent(value || '');
        editor.setEditable(false);
        setIsEditing(false);
    };

    const startEditing = () => {
        if (disabled || !editor || isEditing) return;

        editor.setEditable(true);
        setIsEditing(true);
        editor.commands.focus('end');
    };

    return (
        <div
            onClick={startEditing}
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cancel();
                }
            }}
            className={cn(!disabled && !isEditing && 'cursor-text', className)}
        >
            <EditorContent editor={editor} />
        </div>
    );
};

export default EditableMarkdown;
