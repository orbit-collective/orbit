import { AnimatePresence } from 'framer-motion';
import { Alert } from '@/Components/Molecules/Alert/Alert';
import { AlertContainerProps } from '@/types/Components';

export const AlertContainer = ({
    alerts,
    removeAlert,
}: AlertContainerProps) => {
    return (
        <div className="pointer-events-none fixed right-5 top-5 z-[1000] flex w-full max-w-sm flex-col items-end gap-3">
            <AnimatePresence>
                {alerts.map((alert) => (
                    <Alert
                        key={alert.id}
                        alert={alert}
                        onClose={() => removeAlert(alert.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};
