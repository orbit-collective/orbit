import { AlertOctagon, icons, type LucideIcon } from 'lucide-react';
import { IconProps } from '@/types/Components';

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

function Icon({ name, size = 16, color, className }: IconProps) {
    const LucideIcon: LucideIcon | undefined =
        icons[name] ?? icons[RENAMED_ICONS[name] as typeof name];

    if (!LucideIcon) {
        console.warn(
            `Icon with name ${name} not found. Please check your spelling or use different icon name.`,
        );
        return <AlertOctagon size={size} color={color} className={className} />;
    }

    return <LucideIcon color={color} size={size} className={className} />;
}

export default Icon;
