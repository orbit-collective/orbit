import { ReactNodeViewRenderer } from '@tiptap/react';
import { createMentionNode } from '@/utils/tiptapMentions';
import IssueMentionNodeView from './IssueMentionNodeView';

export { UserMention } from '@/utils/tiptapMentions';

export const IssueMention = createMentionNode('issue', () =>
    ReactNodeViewRenderer(IssueMentionNodeView),
);
