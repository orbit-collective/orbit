import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import type { icons } from 'lucide-react';
import React from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import { IssuePageHeaderProps } from '@/types/Components';
import { DURATION, EASE } from '@/utils/motion';

const Separator = () => (
    <span className="shrink-0 text-(--text-gray-color)">/</span>
);

const IssuePageHeader: React.FC<IssuePageHeaderProps> = ({
    project,
    issue,
    ancestors = [],
    presence,
}) => {
    const { t } = useLaravelReactI18n();

    return (
        <header className="flex items-center justify-between gap-3 border-b border-(--border-color) px-6 py-3">
            <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: DURATION.base, ease: EASE }}
                className="flex min-w-0 items-center gap-2 text-sm"
            >
                <IconButton
                    isLink
                    link={route('projects.show', project.id)}
                    iconName="ArrowLeft"
                    ariaLabel={t('issue_page_header.back_to_project')}
                />
                <Link
                    href={route('projects.show', project.id)}
                    className="shrink-0 text-(--text-gray-color) hover:text-(--text-color)"
                >
                    {project.name}
                </Link>
                <Separator />
                <span className="shrink-0 text-(--text-gray-color)">
                    {t('issue_page_header.issues')}
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
                            className="flex max-w-56 min-w-0 shrink items-center gap-1.5 text-(--text-gray-color) hover:text-(--text-color)"
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
                <span className="flex min-w-0 items-center gap-1.5 text-(--text-color)">
                    {issue.issueType && (
                        <Icon
                            name={issue.issueType.icon as keyof typeof icons}
                            size={13}
                            color={issue.issueType.color}
                            className="shrink-0"
                        />
                    )}
                    <span className="truncate">
                        #{issue.number ?? issue.id} {issue.title}
                    </span>
                </span>
            </motion.div>
            <div className="flex items-center gap-3">
                {presence}
                <IconButton
                    iconName="Link"
                    ariaLabel={t('issue_page_header.copy_link')}
                    onClick={() =>
                        navigator.clipboard.writeText(window.location.href)
                    }
                />
            </div>
        </header>
    );
};

export default IssuePageHeader;
