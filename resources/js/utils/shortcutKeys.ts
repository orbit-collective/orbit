import { ShortcutScope } from '@/types/Shortcuts';

const MODIFIER_ORDER = ['ctrl', 'alt', 'meta', 'shift'];

export const SCOPE_RANK: Record<ShortcutScope, number> = {
    global: 0,
    project: 1,
    issue: 2,
};

export const isMacPlatform = (): boolean =>
    typeof navigator !== 'undefined' &&
    /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);

export const toBindings = (key: string | string[]): string[] =>
    Array.isArray(key) ? key : [key];

/**
 * Canonical form of a binding: lowercase, `mod` resolved to `meta` on macOS
 * and `ctrl` elsewhere, modifiers sorted (ctrl, alt, meta, shift) before the key.
 */
export const normalizeBinding = (binding: string): string => {
    const cleaned = binding.toLowerCase().replace(/\s+/g, ' ').trim();
    if (cleaned === '+' || !cleaned.includes('+')) return cleaned;

    const parts = cleaned.split('+');
    const key = parts.pop() as string;
    const mac = isMacPlatform();
    const modifiers = parts.map((m) =>
        m === 'mod' ? (mac ? 'meta' : 'ctrl') : m,
    );
    modifiers.sort(
        (a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b),
    );

    return [...modifiers, key].join('+');
};

export const normalizeBindings = (key: string | string[]): string[] =>
    toBindings(key).map(normalizeBinding);

/** Stable identity for a definition's whole set of bindings (used for de-duplication). */
export const bindingsId = (key: string | string[]): string =>
    normalizeBindings(key).join('|');

/**
 * Option (macOS) changes `event.key` (`Option+P` → `π`), so for Alt
 * combinations the physical key (`event.code`) is the reliable source.
 */
export const resolveEventKey = (event: KeyboardEvent): string => {
    if (event.altKey) {
        const letter = /^Key([A-Z])$/.exec(event.code ?? '');
        if (letter) return letter[1].toLowerCase();
        const digit = /^Digit(\d)$/.exec(event.code ?? '');
        if (digit) return digit[1];
    }
    return event.key.toLowerCase();
};

const SYMBOLS_MAC: Record<string, string> = {
    mod: '⌘',
    meta: '⌘',
    ctrl: 'CTRL',
    alt: '⌥',
    shift: '⇧',
};

const SYMBOLS_OTHER: Record<string, string> = {
    mod: 'CTRL',
    meta: 'META',
    ctrl: 'CTRL',
    control: 'CTRL',
    alt: 'ALT',
    shift: 'SHIFT',
};

/** Chip labels for a modifier combination, e.g. `mod+k` → `['⌘', 'K']` on macOS. */
export const formatBindingParts = (binding: string): string[] => {
    const symbols = isMacPlatform() ? SYMBOLS_MAC : SYMBOLS_OTHER;
    const lower = binding.toLowerCase().trim();
    if (lower === '+' || !lower.includes('+')) return [lower.toUpperCase()];

    return lower
        .split('+')
        .map(
            (part) =>
                symbols[part] ?? SYMBOLS_OTHER[part] ?? part.toUpperCase(),
        );
};
