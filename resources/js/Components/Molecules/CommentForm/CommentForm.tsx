import IconButton from '@/Components/Atoms/IconButton/IconButton';
import TextArea from '@/Components/Atoms/TextArea/TextArea';
import { CommentFormProps } from '@/types/Components';
import React, { useState } from 'react';

const CommentForm: React.FC<CommentFormProps> = ({
    onSubmit,
    isSubmitting = false,
}) => {
    const [body, setBody] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!body.trim()) return;

        onSubmit(body);
        setBody('');
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] p-3"
        >
            <TextArea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Leave a comment..."
                className="min-h-[60px] resize-none border-none bg-transparent p-0 text-sm focus:border-none"
                isDisabled={isSubmitting}
            />
            <div className="flex justify-end">
                <IconButton
                    type="submit"
                    iconName="ArrowUp"
                    iconSize={14}
                    ariaLabel="Post comment"
                    disabled={isSubmitting || !body.trim()}
                    className="h-7 w-7 rounded-full bg-[var(--bg-light-color-hover)] text-[var(--text-color)] hover:bg-[var(--accent-color)]"
                />
            </div>
        </form>
    );
};

export default CommentForm;
