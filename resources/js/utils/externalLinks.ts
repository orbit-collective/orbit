export const LEARN_URL = 'https://orbit-dev.app/learn';
export const DOCS_URL = 'https://docs.orbit-dev.app';

/** Opens an external page in a new tab without leaking `window.opener`. */
export const openExternal = (url: string): void => {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (opened) opened.opener = null;
};
