import type { icons } from 'lucide-react';
import { RoleTypeValue } from '@/types/Roles';

export interface RoleTypeTheme {
    label: string;
    /** Translation key of `label`. */
    labelKey: string;
    dot: string;
    ring: string;
    badgeClass: string;
    gradient: string;
    icon: keyof typeof icons;
}

export const ROLE_TYPE_THEME: Record<RoleTypeValue, RoleTypeTheme> = {
    owner: {
        label: 'Owner',
        labelKey: 'util_role_theme.owner',
        dot: 'bg-amber-400',
        ring: 'stroke-amber-400',
        badgeClass: 'bg-amber-400/10 text-amber-400',
        gradient: 'from-amber-400/20 to-amber-400/5',
        icon: 'Crown',
    },
    admin: {
        label: 'Admin',
        labelKey: 'util_role_theme.admin',
        dot: 'bg-emerald-400',
        ring: 'stroke-emerald-400',
        badgeClass: 'bg-emerald-400/10 text-emerald-400',
        gradient: 'from-emerald-400/20 to-emerald-400/5',
        icon: 'ShieldCheck',
    },
    member: {
        label: 'Member',
        labelKey: 'util_role_theme.member',
        dot: 'bg-violet-400',
        ring: 'stroke-violet-400',
        badgeClass: 'bg-violet-400/10 text-violet-400',
        gradient: 'from-violet-400/20 to-violet-400/5',
        icon: 'User',
    },
    viewer: {
        label: 'Viewer',
        labelKey: 'util_role_theme.viewer',
        dot: 'bg-sky-400',
        ring: 'stroke-sky-400',
        badgeClass: 'bg-sky-400/10 text-sky-400',
        gradient: 'from-sky-400/20 to-sky-400/5',
        icon: 'Eye',
    },
    custom: {
        label: 'Custom',
        labelKey: 'util_role_theme.custom',
        dot: 'bg-slate-400',
        ring: 'stroke-slate-400',
        badgeClass: 'bg-slate-400/10 text-slate-400',
        gradient: 'from-slate-400/20 to-slate-400/5',
        icon: 'Sparkles',
    },
};
