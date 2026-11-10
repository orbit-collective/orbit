import { motion } from 'framer-motion';
import { icons } from 'lucide-react';
import { ReactNode } from 'react';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Icon from '@/Components/Atoms/Icon/Icon';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import {
    PreviewBar,
    PreviewStage,
} from '@/Components/Molecules/PreviewMotion/PreviewMotion';
import { SPRING } from '@/utils/motion';

interface AccountSettingsProfilePreviewProps {
    name: string;
    avatarSrc: string | null;
    initials: string;
}

function PreviewCardLabel({
    icon,
    label,
}: {
    icon: keyof typeof icons;
    label: string;
}) {
    return (
        <div className="mb-2.5 flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-(--accent-color-opacity) text-(--accent-color)">
                <Icon name={icon} size={11} />
            </span>
            <p className="text-[10px] font-semibold tracking-wider text-(--text-muted-color) uppercase">
                {label}
            </p>
        </div>
    );
}

function PreviewFrame({
    index,
    children,
}: {
    index: number;
    children: ReactNode;
}) {
    return (
        <RowReveal index={index} fill>
            <div className="rounded-xl border border-(--border-color) bg-(--surface-color) p-3.5 transition-colors duration-200 hover:border-(--border-color-strong)">
                <PreviewStage>{children}</PreviewStage>
            </div>
        </RowReveal>
    );
}

/** The avatar pops in whenever the photo changes, so edits feel live. */
function LiveAvatar({
    src,
    initials,
}: {
    src: string | undefined;
    initials: string;
}) {
    return (
        <motion.span
            key={src ?? 'initials'}
            className="flex shrink-0"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={SPRING}
        >
            <Avatar src={src} initials={initials} size="sm" />
        </motion.span>
    );
}

export default function AccountSettingsProfilePreview({
    name,
    avatarSrc,
    initials,
}: AccountSettingsProfilePreviewProps) {
    const displayName = name.trim() || 'Your name';
    const avatarProps = { src: avatarSrc ?? undefined, initials };

    return (
        <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-3">
            <PreviewFrame index={0}>
                <PreviewCardLabel icon="LayoutPanelLeft" label="Sidebar" />
                <div className="overflow-hidden rounded-lg border border-(--border-color) bg-(--bg-color) p-1.5">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 rounded-md bg-(--bg-light-color) px-1.5 py-1">
                            <PreviewBar className="h-2 w-2 rounded-xs bg-(--accent-color)" />
                            <PreviewBar className="h-1 w-10 rounded-full bg-(--text-gray-color)" />
                        </div>
                        <div className="flex items-center gap-1.5 rounded-md px-1.5 py-1">
                            <PreviewBar className="h-2 w-2 rounded-xs bg-(--border-color-strong)" />
                            <PreviewBar className="h-1 w-7 rounded-full bg-(--border-color-strong)" />
                        </div>
                    </div>
                    <div className="my-1.5 border-t border-(--border-color)" />
                    <div className="flex items-center gap-2 rounded-full px-1.5 py-1">
                        <LiveAvatar {...avatarProps} />
                        <p className="truncate text-[11px] font-medium text-(--text-color)">
                            {displayName}
                        </p>
                    </div>
                </div>
            </PreviewFrame>

            <PreviewFrame index={1}>
                <PreviewCardLabel icon="MessageSquare" label="Comment" />
                <div className="rounded-lg border border-(--border-color) bg-(--bg-color) p-2.5">
                    <div className="flex items-start gap-2">
                        <LiveAvatar {...avatarProps} />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <p className="truncate text-[11px] font-medium text-(--text-color)">
                                    {displayName}
                                </p>
                                <span className="text-[10px] text-(--text-muted-color)">
                                    2m ago
                                </span>
                            </div>
                            <div className="mt-1.5 space-y-1">
                                <PreviewBar className="h-1.5 w-full rounded-full bg-(--bg-light-color)" />
                                <PreviewBar className="h-1.5 w-3/5 rounded-full bg-(--bg-light-color)" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5 border-t border-(--border-color) pt-2 text-[10px] text-(--text-muted-color)">
                        <Icon name="Reply" size={10} />
                        Reply
                    </div>
                </div>
            </PreviewFrame>

            <PreviewFrame index={2}>
                <PreviewCardLabel icon="UserCheck" label="Issue row" />
                <div className="overflow-hidden rounded-lg border border-(--border-color) bg-(--bg-color)">
                    <div className="flex items-center gap-2 border-b border-(--border-color) bg-(--bg-light-color) px-2 py-1.5">
                        <PreviewBar className="h-1 w-6 rounded-full bg-(--text-muted-color)" />
                        <div className="ml-auto h-1 w-8 rounded-full bg-(--text-muted-color)" />
                    </div>
                    <div className="flex items-center gap-2 px-2 py-2.5">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--info-color)" />
                        <PreviewBar className="h-1.5 flex-1 rounded-full bg-(--bg-light-color)" />
                        <LiveAvatar {...avatarProps} />
                    </div>
                </div>
            </PreviewFrame>
        </div>
    );
}
