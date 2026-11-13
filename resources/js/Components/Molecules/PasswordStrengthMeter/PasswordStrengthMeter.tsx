import { useLaravelReactI18n } from 'laravel-react-i18n';
import {
    getPasswordStrength,
    PasswordStrength,
    passwordStrengthCopy,
} from '@/utils/passwordStrength';

interface PasswordStrengthMeterProps {
    password: string;
}

const TIERS: PasswordStrength[] = ['weak', 'fair', 'strong'];

export default function PasswordStrengthMeter({
    password,
}: PasswordStrengthMeterProps) {
    const { t } = useLaravelReactI18n();
    const strength = getPasswordStrength(password);

    if (!strength) {
        return null;
    }

    const activeIndex = TIERS.indexOf(strength);

    return (
        <div className="flex items-center gap-2 px-0.5">
            <div className="flex flex-1 gap-1">
                {TIERS.map((tier, index) => (
                    <div
                        key={tier}
                        className={`h-1 flex-1 rounded-full ${
                            index <= activeIndex
                                ? passwordStrengthCopy[strength].className
                                : 'bg-(--bg-light-color)'
                        }`}
                    />
                ))}
            </div>
            <span className="text-[10px] font-medium text-(--text-muted-color)">
                {t(`password_strength_meter.${strength}`)}
            </span>
        </div>
    );
}
