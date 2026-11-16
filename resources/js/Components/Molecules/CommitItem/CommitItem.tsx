import { useLaravelReactI18n } from 'laravel-react-i18n';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import { DevelopmentCommit } from '@/types/Development';
import { cn } from '@/utils/cn';
import { shortSha } from '@/utils/development';
import { FOCUS_RING } from '@/utils/focusRing';
import { formatTimeAgo } from '@/utils/time';

/** One commit: who made it, its subject (a link to GitHub), the short sha and how long ago. */
export default function CommitItem({ commit }: { commit: DevelopmentCommit }) {
    const { t } = useLaravelReactI18n();
    const name = commit.author?.login ?? commit.authorName;

    return (
        <li className="flex items-center gap-2.5 py-1.5">
            <Avatar
                src={commit.author?.avatarUrl}
                alt={name}
                initials={name.slice(0, 2).toUpperCase()}
                size="sm"
            />
            <div className="min-w-0 flex-1">
                <a
                    href={commit.url}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                        'block truncate rounded-sm text-xs font-medium text-(--text-color) hover:text-(--accent-color)',
                        FOCUS_RING,
                    )}
                >
                    {commit.message}
                </a>
                <span className="block truncate text-[11px] text-(--text-muted-color)">
                    {name}
                    {commit.committedAt &&
                        ` · ${t('commit_item.ago', {
                            time: formatTimeAgo(commit.committedAt, t),
                        })}`}
                </span>
            </div>
            <code className="shrink-0 rounded-sm bg-(--bg-light-color) px-1.5 py-0.5 text-[11px] text-(--text-gray-color)">
                {shortSha(commit.sha)}
            </code>
        </li>
    );
}
