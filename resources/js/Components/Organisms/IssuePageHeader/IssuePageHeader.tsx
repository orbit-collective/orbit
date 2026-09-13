import Icon from '@/Components/Atoms/Icon/Icon';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import { IssuePageHeaderProps } from '@/types/Components';
import { Link } from '@inertiajs/react';
import { icons } from 'lucide-react';
import React from 'react';

const Separator = () => (
    <span className="shrink-0 text-[var(--text-gray-color)]">/</span>
);

const IssuePageHeader: React.FC<IssuePageHeaderProps> = ({
    project,
    issue,
    ancestors = [],
}) => {
    return (
        <header className="flex items-center justify-between gap-3 border-b border-solid border-[var(--border-color)] px-6 py-3">
            <div className="flex min-w-0 items-center gap-2 text-sm">
                <IconButton
                    isLink
                    link={route('projects.show', project.id)}
                    iconName="ArrowLeft"
                    ariaLabel="Back to project"
                />
                <Link
                    href={route('projects.show', project.id)}
                    className="shrink-0 text-[var(--text-gray-color)] hover:text-[var(--text-color)]"
                >
                    {project.name}
                </Link>
                <Separator />
                <span className="shrink-0 text-[var(--text-gray-color)]">
                    Issues
                </span>

                {ancestors.map((ancestor) => (
                    <React.Fragment key={ancestor.id}>
                        <Separator />
                        <Link
                            href={route('issues.show', [
                                project.id,
                                ancestor.id,
                            ])}
                            title={ancestor.title}
                            className="flex min-w-0 max-w-[14rem] shrink items-center gap-1.5 text-[var(--text-gray-color)] hover:text-[var(--text-color)]"
                        >
                            {ancestor.issueType && (
                                <Icon
                                    name={
                                        ancestor.issueType
                                            .icon as keyof typeof icons
                                    }
                                    size={13}
                                    color={ancestor.issueType.color}
                                    className="shrink-0"
                                />
                            )}
                            <span className="truncate">{ancestor.title}</span>
                        </Link>
                    </React.Fragment>
                ))}

                <Separator />
                <span className="flex min-w-0 items-center gap-1.5 text-[var(--text-color)]">
                    {issue.issueType && (
                        <Icon
                            name={issue.issueType.icon as keyof typeof icons}
                            size={13}
                            color={issue.issueType.color}
                            className="shrink-0"
                        />
                    )}
                    <span className="truncate">
                        #{issue.id} {issue.title}
                    </span>
                </span>
            </div>
            <div className="flex items-center gap-1">
                <IconButton
                    iconName="Link"
                    ariaLabel="Copy issue link"
                    onClick={() =>
                        navigator.clipboard.writeText(window.location.href)
                    }
                />
            </div>
        </header>
    );
};

export default IssuePageHeader;
