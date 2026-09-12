import { icons } from 'lucide-react';

/**
 * Curated subset of lucide-react icon names offered by the issue type icon
 * picker. Kept as plain strings (rather than importing every lucide icon)
 * so the picker stays a manageable, on-brand set instead of lucide's full
 * catalog of 1000+ icons - custom issue types choose from this list, the
 * 16 system types below always resolve to one of these too.
 */
export const ISSUE_TYPE_ICON_OPTIONS: (keyof typeof icons)[] = [
    'SquareCheck',
    'Sparkles',
    'BookOpen',
    'Bug',
    'Zap',
    'Microscope',
    'Wrench',
    'TrendingUp',
    'Flame',
    'Shield',
    'Server',
    'FlaskConical',
    'TestTube',
    'FileText',
    'Palette',
    'Bot',
    'Megaphone',
    'Scale',
    'PenTool',
    'ShoppingCart',
    'Users',
    'Package',
    'ClipboardCheck',
    'Rocket',
    'Target',
    'Layers',
    'GitBranch',
    'Lightbulb',
    'Star',
    'Flag',
];
