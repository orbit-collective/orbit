import image from '@assets/logo.png';
import { OrbitRing } from '../OrbitRing/OrbitRing';

const ORBIT_DURATION = 32;

export const OrbitGraphic = () => (
    <div className="relative z-10 flex flex-1 items-center justify-center">
        <div className="relative flex h-[260px] w-[260px] items-center justify-center xl:h-[320px] xl:w-[320px]">
            <div className="absolute h-[62%] w-[62%] rounded-full border border-dashed border-[var(--bg-light-color)]" />
            <div className="border-[var(--bg-light-color)]/60 absolute h-full w-full rounded-full border border-dashed" />

            <div className="absolute h-16 w-16 rounded-full bg-[var(--accent-color)] opacity-30 blur-xl" />
            <div className="absolute flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-transparent shadow-lg">
                <img
                    src={image}
                    alt={'Logo'}
                    className={'h-16 w-16 object-contain'}
                    width={64}
                    height={64}
                />
            </div>

            <OrbitRing
                radius={90}
                duration={ORBIT_DURATION}
                items={[
                    { name: 'ListChecks', angle: 0 },
                    { name: 'FolderGit2', angle: 120 },
                    { name: 'Bell', angle: 240 },
                ]}
            />
            <OrbitRing
                radius={140}
                duration={ORBIT_DURATION * 1.6}
                reverse
                items={[
                    { name: 'LayoutDashboard', angle: 30 },
                    { name: 'Users', angle: 102 },
                    { name: 'Calendar', angle: 174 },
                    { name: 'Activity', angle: 246 },
                    { name: 'GitBranch', angle: 318 },
                ]}
            />
        </div>
    </div>
);
