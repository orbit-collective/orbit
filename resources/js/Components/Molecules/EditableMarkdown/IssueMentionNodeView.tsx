import IssueMentionLink from '@/Components/Molecules/IssueMentionLink/IssueMentionLink';
import { MentionAttrs } from '@/utils/tiptapMentions';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';

/**
 * Renders an "#12" mention inside the description editor the way a comment
 * does: a link to the issue with the hover preview card.
 */
export default function IssueMentionNodeView({
    node,
    extension,
}: NodeViewProps) {
    const attrs = node.attrs as MentionAttrs;

    return (
        <NodeViewWrapper as="span" className="inline">
            <IssueMentionLink
                projectId={extension.options.projectId}
                issueId={Number(attrs.id)}
                title={attrs.label ?? ''}
                label={`#${attrs.number ?? attrs.id}`}
            />
        </NodeViewWrapper>
    );
}
