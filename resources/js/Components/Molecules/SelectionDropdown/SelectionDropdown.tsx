import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import { useModal } from '@/context/ModalContext';
import { useShortcuts } from '@/context/ShortcutContext';
import { SelectionDropdownProps } from '@/types/Components';
import { DropdownOptionItem } from '@/types/Dropdown';
import { ShortcutDefinition } from '@/types/Shortcuts';
import { useCallback, useMemo, useState } from 'react';

const KIND_ROLES = {
    checkbox: 'menuitemcheckbox',
    radio: 'menuitemradio',
    action: 'menuitem',
} as const;

/**
 * The table's "display columns" menu: a list of toggles, radio rows and
 * actions behind any trigger. Stays open while you adjust several things.
 */
export default function SelectionDropdown({
    options,
    selectedValues,
    onChange,
    trigger,
}: SelectionDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { getIfAnyModalIsOpened } = useModal();

    const items = useMemo(
        (): DropdownOptionItem[] =>
            options.map((option) => {
                const kind = option.kind ?? 'checkbox';

                if (kind === 'separator') {
                    return {
                        value: option.value,
                        label: option.label,
                        kind: 'separator',
                    };
                }

                return {
                    value: option.value,
                    label: option.label,
                    disabled: option.disabled,
                    role: KIND_ROLES[kind],
                    indicator: kind === 'action' ? 'none' : 'check',
                    closeOnSelect: false,
                };
            }),
        [options],
    );

    const toggle = useCallback(() => setIsOpen((previous) => !previous), []);

    const shortcuts = useMemo(
        (): ShortcutDefinition[] => [
            {
                key: 'alt+s',
                description: 'Open selection dropdown',
                category: 'Search',
                action: () => {
                    if (!getIfAnyModalIsOpened()) {
                        toggle();
                    }
                },
            },
        ],
        [getIfAnyModalIsOpened, toggle],
    );

    useShortcuts(shortcuts);

    return (
        <Dropdown
            variant="menu"
            title="Display Columns"
            ariaLabel="Display columns"
            align="end"
            options={items}
            selectedValues={selectedValues}
            onSelect={(value) => onChange(value)}
            open={isOpen}
            onOpenChange={setIsOpen}
            trigger={trigger}
        />
    );
}
