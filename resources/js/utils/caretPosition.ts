const MIRRORED_PROPERTIES = [
    'direction',
    'boxSizing',
    'width',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
] as const;

export interface CaretCoordinates {
    top: number;
    left: number;
    height: number;
}

/**
 * Computes the pixel offset of a caret position inside a <textarea>,
 * relative to the textarea's own top-left corner (padding box). Uses the
 * classic "mirror div" technique: an invisible clone of the textarea styled
 * identically, with the text up to `position` inserted and a marker span
 * placed right after it — the marker's offset is then the caret's offset.
 */
export function getCaretCoordinates(
    element: HTMLTextAreaElement,
    position: number,
): CaretCoordinates {
    const mirror = document.createElement('div');
    const computed = window.getComputedStyle(element);

    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.left = '-9999px';
    mirror.style.top = '0px';

    MIRRORED_PROPERTIES.forEach((prop) => {
        mirror.style.setProperty(
            prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`),
            computed.getPropertyValue(
                prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`),
            ),
        );
    });

    mirror.textContent = element.value.substring(0, position);

    const marker = document.createElement('span');
    marker.textContent = element.value.substring(position) || '.';
    mirror.appendChild(marker);

    document.body.appendChild(mirror);

    const coordinates: CaretCoordinates = {
        top: marker.offsetTop,
        left: marker.offsetLeft,
        height: marker.offsetHeight,
    };

    document.body.removeChild(mirror);

    return coordinates;
}
