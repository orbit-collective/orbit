import { BoardCard } from '@/Components/Organisms/BoardCard/BoardCard';
import { ListRow } from '@/Components/Organisms/ListRow/ListRow';
import { IssueElementProps } from '@/types/Components';
import { Issue } from '@/types/Issues';
import { router } from '@inertiajs/react';

export const IssueElement = ({
    issue,
    type = 'list',
    handleSelectIssueCheckbox,
    enabledColumns,
    rowHeight,
    depth,
    hasChildren,
    isCollapsed,
    onToggleCollapse,
}: IssueElementProps) => {
    const removeIssue = (issue: Issue) => {
        router.delete(route('issues.destroy', issue.id));
    };

    const props = {
        issue,
        isClosed: issue.workflowStatus
            ? issue.workflowStatus.category === 'done'
            : issue.status === 'closed',
        onClick: () =>
            router.visit(route('issues.show', [issue.project_id, issue.id])),
        onRemove: () => removeIssue(issue),
    };

    return type === 'board' ? (
        <BoardCard {...props} />
    ) : (
        <ListRow
            {...props}
            handleSelectIssueCheckbox={handleSelectIssueCheckbox}
            enabledColumns={enabledColumns}
            rowHeight={rowHeight}
            depth={depth}
            hasChildren={hasChildren}
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
        />
    );
};

export default IssueElement;
