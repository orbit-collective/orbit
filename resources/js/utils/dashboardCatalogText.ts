type Translate = (
    key: string,
    replacements?: Record<string, string | number>,
) => string;

/** The groups of the `dashboard_catalog` language file a catalog text can live in. */
type CatalogTextGroup = 'labels' | 'descriptions' | 'values';

const slug = (text: string) =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

/**
 * The text of the dashboard widget catalog (widget names, descriptions, option
 * labels) is sent by the server in English. The translation is looked up by
 * that text; a text without a translation stays as the server wrote it.
 */
export const catalogText = (
    t: Translate,
    group: CatalogTextGroup,
    text: string,
): string => {
    const key = `dashboard_catalog.${group}.${slug(text)}`;
    const translated = t(key);

    return translated === key ? text : translated;
};
