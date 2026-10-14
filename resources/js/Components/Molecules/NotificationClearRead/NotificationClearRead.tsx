import { useState } from 'react';

interface NotificationClearReadProps {
    onConfirm: () => void;
}

/** "Delete all read" with an inline second step, since it cannot be undone. */
function NotificationClearRead({ onConfirm }: NotificationClearReadProps) {
    const [isConfirming, setIsConfirming] = useState(false);

    if (!isConfirming) {
        return (
            <button
                type="button"
                onClick={() => setIsConfirming(true)}
                className="text-xs font-medium text-[var(--text-gray-color)] hover:text-[var(--text-color)] hover:underline"
            >
                Delete all read
            </button>
        );
    }

    return (
        <span className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-gray-color)]">
                Delete every read notification?
            </span>
            <button
                type="button"
                onClick={() => {
                    setIsConfirming(false);
                    onConfirm();
                }}
                className="font-semibold text-[var(--error-color)] hover:underline"
            >
                Delete
            </button>
            <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="font-medium text-[var(--text-gray-color)] hover:underline"
            >
                Cancel
            </button>
        </span>
    );
}

export default NotificationClearRead;
