/**
 * The keyboard focus highlight used across the Developer Portal: invisible to
 * the mouse, a clear accent ring for TAB. `FOCUS_RING` floats outside the
 * element (small controls); `FOCUS_RING_INSET` draws inside it, for full-width
 * rows and headers inside clipped panels where an outside ring would be cut.
 */
export const FOCUS_RING =
    'outline-hidden focus-visible:ring-2 focus-visible:ring-(--accent-color) focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface-color)';

export const FOCUS_RING_INSET =
    'outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--accent-color)';
