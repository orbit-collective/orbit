type Translate = (
    key: string,
    replacements?: Record<string, string | number>,
) => string;

/**
 * The dashboard widget catalog (widget names, descriptions, option labels and
 * values, styles) is sent by the server in English. Its translations are
 * looked up by the stable ids the server also sends, never by its wording, so
 * a copy edit on the server cannot drop a translation:
 *
 * - `widgets.<type>.label` / `.description`
 * - `widgets.<type>.options.<option>.label`
 * - `widgets.<type>.options.<option>.values.<value>`
 * - `variants.<variant>` and `widths.<width>`
 *
 * An id without a translation (a new widget or option) keeps the text the
 * server sent.
 */
export const catalogText = (
    t: Translate,
    id: string,
    serverText: string,
): string => {
    const key = `dashboard_catalog.${id}`;
    const translated = t(key);

    return translated === key ? serverText : translated;
};
