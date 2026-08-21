import { RoleTypeValue } from '@/types/Roles';
import { icons } from 'lucide-react';

export interface RoleTypeTheme {
    label: string;
    dot: string;
    ring: string;
    badgeClass: string;
    gradient: string;
    icon: keyof typeof icons;
}

export const ROLE_TYPE_THEME: Record<RoleTypeValue, RoleTypeTheme> = {
    owner: {
        label: 'Owner',
        dot: 'bg-amber-400',
        ring: 'stroke-amber-400',
        badgeClass: 'bg-amber-400/10 text-amber-400',
        gradient: 'from-amber-400/20 to-amber-400/5',
        icon: 'Crown',
    },
    admin: {
        label: 'Admin',
        dot: 'bg-emerald-400',
        ring: 'stroke-emerald-400',
        badgeClass: 'bg-emerald-400/10 text-emerald-400',
        gradient: 'from-emerald-400/20 to-emerald-400/5',
        icon: 'ShieldCheck',
    },
    member: {
        label: 'Member',
        dot: 'bg-violet-400',
        ring: 'stroke-violet-400',
        badgeClass: 'bg-violet-400/10 text-violet-400',
        gradient: 'from-violet-400/20 to-violet-400/5',
        icon: 'User',
    },
    viewer: {
        label: 'Viewer',
        dot: 'bg-sky-400',
        ring: 'stroke-sky-400',
        badgeClass: 'bg-sky-400/10 text-sky-400',
        gradient: 'from-sky-400/20 to-sky-400/5',
        icon: 'Eye',
    },
    custom: {
        label: 'Custom',
        dot: 'bg-slate-400',
        ring: 'stroke-slate-400',
        badgeClass: 'bg-slate-400/10 text-slate-400',
        gradient: 'from-slate-400/20 to-slate-400/5',
        icon: 'Sparkles',
    },
};
