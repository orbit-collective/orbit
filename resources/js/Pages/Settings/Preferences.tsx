import AccountSettingsPreferencesTab from '@/Components/Organisms/AccountSettingsContent/AccountSettingsPreferencesTab';
import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import { Project } from '@/types/Projects';

interface SettingsPreferencesProps {
    projects?: Project[];
}

export default function SettingsPreferences({
    projects = [],
}: SettingsPreferencesProps) {
    return (
        <SettingsLayout tabId="preferences" projects={projects}>
            <AccountSettingsPreferencesTab />
        </SettingsLayout>
    );
}
