import { IntegrationCategory } from '@/types/Integrations';

const CATEGORY_BADGE_CLASSNAMES: Record<IntegrationCategory, string> = {
    Communication: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
    'Developer tools':
        'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    Storage: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    Productivity: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
};

export function getCategoryBadgeClassName(
    category: IntegrationCategory,
): string {
    return CATEGORY_BADGE_CLASSNAMES[category];
}
