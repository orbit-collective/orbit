import { motion } from 'framer-motion';
import Icon from '@/Components/Atoms/Icon/Icon';
import LanguageFlag from '@/Components/Atoms/LanguageFlag/LanguageFlag';
import SelectionHighlight from '@/Components/Atoms/SelectionHighlight/SelectionHighlight';
import { SPRING, liftProps } from '@/utils/motion';

interface AccountSettingsLanguageCardProps {
    /** Language code ("en"), drawn as its flag. */
    code: string;
    /** The language's own name ("Polski"). */
    name: string;
    /** The name in the current interface language; hidden when it is the same. */
    subtitle?: string;
    selected: boolean;
    /** Cards of one choice share it, so the highlight glides between them. */
    groupId?: string;
    onSelect: () => void;
}

/**
 * One choice of the language picker: a compact button with the flag, the
 * language's own name and a check. A plain button, so every card is a Tab stop
 * and Enter / Space picks it; the group (see the Preferences tab) also moves
 * focus with the arrow keys. The focus ring is drawn explicitly because the
 * app resets `outline`.
 */
export default function AccountSettingsLanguageCard({
    code,
    name,
    subtitle,
    selected,
    groupId,
    onSelect,
}: AccountSettingsLanguageCardProps) {
    return (
        <motion.button
            type="button"
            aria-pressed={selected}
            data-language-card
            onClick={onSelect}
            {...liftProps}
            className="relative flex w-full items-center gap-3 rounded-xl border border-(--border-color) bg-(--surface-color) px-3 py-2.5 text-left transition-colors hover:border-(--border-color-strong) focus-visible:ring-2 focus-visible:ring-(--accent-color) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-color)"
        >
            {selected && <SelectionHighlight layoutId={groupId} />}
            <LanguageFlag code={code} className="relative" />
            <span className="relative min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-(--text-color)">
                    {name}
                </span>
                {subtitle && subtitle !== name && (
                    <span className="block truncate text-xs text-(--text-gray-color)">
                        {subtitle}
                    </span>
                )}
            </span>
            <span
                aria-hidden="true"
                className={`relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
                    selected
                        ? 'border-(--accent-color) text-(--accent-color)'
                        : 'border-(--border-color-strong) text-transparent'
                }`}
            >
                <motion.span
                    className="flex"
                    initial={false}
                    animate={{
                        scale: selected ? 1 : 0.4,
                        opacity: selected ? 1 : 0,
                    }}
                    transition={SPRING}
                >
                    <Icon name="Check" size={11} />
                </motion.span>
            </span>
        </motion.button>
    );
}
