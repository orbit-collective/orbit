import { useLaravelReactI18n } from 'laravel-react-i18n';
import Icon from '@/Components/Atoms/Icon/Icon';
import StatusPill from '@/Components/Atoms/StatusPill/StatusPill';
import { DevelopmentBranch } from '@/types/Development';
import { shortSha } from '@/utils/development';

/** One branch: its name, a pill for the default or a protected one, and the short sha it points at. */
export default function BranchItem({ branch }: { branch: DevelopmentBranch }) {
    const { t } = useLaravelReactI18n();

    return (
        <li className="flex items-center gap-2 py-1.5 text-xs">
            <Icon
                name="GitBranch"
                size={14}
                className="shrink-0 text-(--text-muted-color)"
            />
            <span className="min-w-0 flex-1 truncate font-medium text-(--text-color)">
                {branch.name}
            </span>
            {branch.isDefault && (
                <StatusPill tone="accent" icon="Star">
                    {t('branch_item.default')}
                </StatusPill>
            )}
            {branch.protected && (
                <StatusPill tone="neutral" icon="ShieldCheck">
                    {t('branch_item.protected')}
                </StatusPill>
            )}
            <code className="shrink-0 rounded-sm bg-(--bg-light-color) px-1.5 py-0.5 text-[11px] text-(--text-gray-color)">
                {shortSha(branch.sha)}
            </code>
        </li>
    );
}
