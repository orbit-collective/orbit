/**
 * Lets an overlay that owns the keyboard (the product tour) switch the
 * global shortcuts off while it is open — otherwise e.g. Alt+P would
 * navigate away from under a step. A counter rather than a boolean so
 * overlapping users can't re-enable each other's suspension.
 */
let suspensions = 0;

export const areShortcutsSuspended = (): boolean => suspensions > 0;

/** Suspends global shortcuts; call the returned function to release. */
export const suspendShortcuts = (): (() => void) => {
    suspensions += 1;
    let released = false;

    return () => {
        if (released) return;
        released = true;
        suspensions -= 1;
    };
};
