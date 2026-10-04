import { createMentionNode } from '@/utils/tiptapMentions';
import { ReactNodeViewRenderer } from '@tiptap/react';
import IssueMentionNodeView from './IssueMentionNodeView';

export { UserMention } from '@/utils/tiptapMentions';

export const IssueMention = createMentionNode('issue', () =>
    ReactNodeViewRenderer(IssueMentionNodeView),
);
