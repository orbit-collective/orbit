import Button from '@/Components/Atoms/Button/Button';
import Input from '@/Components/Atoms/Input/Input';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { SyntheticEvent } from 'react';

interface JoinWithCodePanelProps {
    token: string;
    error: string | null;
    isJoining: boolean;
    onChange: (token: string) => void;
    onSubmit: (event: SyntheticEvent) => void;
}

export default function JoinWithCodePanel({
    token,
    error,
    isJoining,
    onChange,
    onSubmit,
}: JoinWithCodePanelProps) {
    return (
        <SettingsPanel
            title="Join with an invite code"
            description="Already have an invitation? Paste its code to join instantly."
            icon="Link"
        >
            <SettingsPanelRow
                title="Invitation code"
                description="If the link in your email doesn't work, paste the code here."
                action={
                    <form
                        onSubmit={onSubmit}
                        className="flex flex-col items-end gap-1.5"
                    >
                        <div className="flex items-center gap-2">
                            <Input
                                value={token}
                                onChange={(event) =>
                                    onChange(event.target.value)
                                }
                                placeholder="Invitation code"
                                className="h-9 w-56"
                            />
                            <Button
                                type="submit"
                                isDisabled={isJoining}
                                className="h-9"
                            >
                                Join
                            </Button>
                        </div>
                        {error && (
                            <span className="text-xs text-[var(--error-color)]">
                                {error}
                            </span>
                        )}
                    </form>
                }
            />
        </SettingsPanel>
    );
}
