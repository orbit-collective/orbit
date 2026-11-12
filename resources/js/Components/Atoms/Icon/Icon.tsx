import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { IconProps } from '@/types/Components';
import { iconRegistry } from '@/utils/iconRegistry';

const FallbackIcon = iconRegistry.OctagonExclamationPoint;

// lucide-react 1.68 renamed the *Alert and *Warning icons. Names saved before
// that (issue types, dashboard widget options, saved layouts) still resolve.
const RENAMED_ICONS: Record<string, string> = {
    BadgeAlert: 'BadgeExclamationPoint',
    BatteryWarning: 'BatteryExclamationPoint',
    BookAlert: 'BookExclamationPoint',
    CircleAlert: 'CircleExclamationPoint',
    ClockAlert: 'ClockExclamationPoint',
    CloudAlert: 'CloudExclamationPoint',
    MailWarning: 'MailExclamationPoint',
    MessageCircleWarning: 'MessageCircleExclamationPoint',
    MessageSquareWarning: 'MessageSquareExclamationPoint',
    OctagonAlert: 'OctagonExclamationPoint',
    SearchAlert: 'SearchExclamationPoint',
    ShieldAlert: 'ShieldExclamationPoint',
    TriangleAlert: 'TriangleExclamationPoint',
};

type IconSet = Record<string, LucideIcon>;

// The full lucide set (~2000 icons) is a separate chunk, fetched the first
// time a name outside `iconRegistry` is rendered and kept for the session.
let fullSet: IconSet | null = null;
let loading: Promise<IconSet> | null = null;

function loadFullSet(): Promise<IconSet> {
    loading ??= import('lucide-react').then(
        (module) => {
            fullSet = module.icons as unknown as IconSet;
            return fullSet;
        },
        (error: unknown) => {
            // A failed download is not kept: the next icon to need the set
            // tries again.
            loading = null;
            throw error;
        },
    );

    return loading;
}

function LazyIcon({ name, size, color, className }: IconProps) {
    const [set, setSet] = useState<IconSet | null>(fullSet);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (set) {
            return;
        }

        let active = true;
        loadFullSet().then(
            (loaded) => active && setSet(loaded),
            () => active && setFailed(true),
        );

        return () => {
            active = false;
        };
    }, [set]);

    if (failed) {
        return <FallbackIcon size={size} color={color} className={className} />;
    }

    if (!set) {
        // Keep the icon's box so the layout does not jump when it arrives.
        return (
            <span
                aria-hidden="true"
                className={className}
                style={{ display: 'inline-block', width: size, height: size }}
            />
        );
    }

    const Found: LucideIcon | undefined = set[name] ?? set[RENAMED_ICONS[name]];

    if (!Found) {
        console.warn(
            `Icon with name ${name} not found. Please check your spelling or use different icon name.`,
        );
        return <FallbackIcon size={size} color={color} className={className} />;
    }

    return <Found color={color} size={size} className={className} />;
}

function Icon({ name, size = 16, color, className }: IconProps) {
    const Known: LucideIcon | undefined =
        iconRegistry[name] ?? iconRegistry[RENAMED_ICONS[name]];

    if (!Known) {
        return (
            <LazyIcon
                name={name}
                size={size}
                color={color}
                className={className}
            />
        );
    }

    return <Known color={color} size={size} className={className} />;
}

export default Icon;
