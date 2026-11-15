import { IntegrationDefinition } from '@/types/Integrations';

export type IntegrationState = 'enabled' | 'disabled' | 'soon';
export type IntegrationStateFilter = 'all' | IntegrationState;

export const INTEGRATION_STATE_FILTERS: IntegrationStateFilter[] = [
    'all',
    'enabled',
    'disabled',
    'soon',
];

/** Where an integration stands: switched on, switched off, or not shipped yet. */
export function integrationState(
    integration: IntegrationDefinition,
    enabled: boolean,
): IntegrationState {
    if (integration.comingSoon) return 'soon';

    return enabled ? 'enabled' : 'disabled';
}

/** Lower case without accents, so "zdarzen" finds "zdarzeń". */
export function normalizeSearchText(value: string): string {
    return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/**
 * Whether every word of the query appears somewhere in the text, in any
 * order. An empty query matches everything.
 */
export function matchesSearch(text: string, query: string): boolean {
    const words = normalizeSearchText(query).split(/\s+/).filter(Boolean);

    if (words.length === 0) return true;

    const haystack = normalizeSearchText(text);

    return words.every((word) => haystack.includes(word));
}
