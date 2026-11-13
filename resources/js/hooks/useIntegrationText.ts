import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useCallback } from 'react';
import {
    IntegrationDefinition,
    IntegrationPreviewSample,
    IntegrationSubOption,
} from '@/types/Integrations';

/**
 * Reads the translated texts of an integrations-catalog entry. The catalog
 * (types/Integrations.ts) keeps its English text as the fallback; the
 * translations live under `integrations_catalog.<id>.*` in lang/<locale>/.
 * A missing key falls back to the catalog's own text.
 */
export function useIntegrationText() {
    const { t } = useLaravelReactI18n();

    const translate = useCallback(
        (key: string, fallback: string) => {
            const value = t(key);

            return value === key ? fallback : value;
        },
        [t],
    );

    return {
        vendor: (integration: IntegrationDefinition) =>
            translate(
                `integrations_catalog.${integration.id}.vendor`,
                integration.vendor,
            ),
        description: (integration: IntegrationDefinition) =>
            translate(
                `integrations_catalog.${integration.id}.description`,
                integration.description,
            ),
        overview: (integration: IntegrationDefinition) =>
            translate(
                `integrations_catalog.${integration.id}.overview`,
                integration.overview,
            ),
        sampleTitle: (
            integration: IntegrationDefinition,
            index: number,
            sample: IntegrationPreviewSample,
        ) =>
            translate(
                `integrations_catalog.${integration.id}.preview.p${index + 1}.title`,
                sample.title,
            ),
        sampleTime: (
            integration: IntegrationDefinition,
            index: number,
            sample: IntegrationPreviewSample,
        ) =>
            translate(
                `integrations_catalog.${integration.id}.preview.p${index + 1}.time`,
                sample.time,
            ),
        optionTitle: (
            integration: IntegrationDefinition,
            option: IntegrationSubOption,
        ) =>
            translate(
                `integrations_catalog.${integration.id}.options.${option.id}.title`,
                option.title,
            ),
        optionDescription: (
            integration: IntegrationDefinition,
            option: IntegrationSubOption,
        ) =>
            translate(
                `integrations_catalog.${integration.id}.options.${option.id}.description`,
                option.description,
            ),
    };
}
