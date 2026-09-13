import AccountSettingsProfileTab from '@/Components/Organisms/AccountSettingsContent/AccountSettingsProfileTab';
import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import { PageProps } from '@/types';
import { Project } from '@/types/Projects';
import { usePage } from '@inertiajs/react';

interface SettingsProfileProps {
    projects?: Project[];
}

export default function SettingsProfile({
    projects = [],
}: SettingsProfileProps) {
    const { props } = usePage<PageProps>();

    return (
        <SettingsLayout tabId="profile" projects={projects}>
            <AccountSettingsProfileTab
                userName={props.auth?.user?.name ?? 'John Doe'}
                userAvatar={props.auth?.user?.avatar ?? null}
            />
        </SettingsLayout>
    );
}
