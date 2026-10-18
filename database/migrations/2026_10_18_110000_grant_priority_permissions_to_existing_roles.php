<?php

use App\Enums\Permissions\Permission as PermissionEnum;
use App\Models\Permission;
use App\Support\Cache\CacheVersion;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const array KEYS = [
        PermissionEnum::PRIORITIES_VIEW,
        PermissionEnum::PRIORITIES_CREATE,
        PermissionEnum::PRIORITIES_UPDATE,
        PermissionEnum::PRIORITIES_DELETE,
    ];

    /**
     * New permissions are not granted to roles that already exist (system
     * roles only get their defaults when first created), so the priority
     * permissions are added here: all four to Owner and Admin, which are
     * defined as "everything", and view to Member and Viewer like the other
     * catalogs. Additive and idempotent; custom roles are left alone.
     */
    public function up(): void
    {
        foreach (self::KEYS as $permission) {
            [$group] = explode('.', $permission->value);

            Permission::query()->updateOrCreate(
                ['key' => $permission->value],
                ['name' => $permission->name, 'group' => $group],
            );
        }

        $ids = Permission::query()
            ->whereIn('key', array_map(fn (PermissionEnum $permission) => $permission->value, self::KEYS))
            ->pluck('id', 'key');

        $this->grant(['owner', 'admin'], $ids->all());
        $this->grant(['member', 'viewer'], [$ids[PermissionEnum::PRIORITIES_VIEW->value]]);

        try {
            CacheVersion::bump(CacheVersion::MEMBERSHIP);
        } catch (Throwable) {
            // The cache may be unreachable while migrating; entries age out via their TTL.
        }
    }

    public function down(): void
    {
        $ids = Permission::query()->where('key', 'like', 'projects.priorities.%')->pluck('id');

        DB::table('permission_role')->whereIn('permission_id', $ids)->delete();
    }

    /** @param  list<string>  $tiers */
    private function grant(array $tiers, array $permissionIds): void
    {
        DB::table('roles')
            ->where('is_system', true)
            ->whereIn('role', $tiers)
            ->pluck('id')
            ->each(function (int $roleId) use ($permissionIds) {
                foreach ($permissionIds as $permissionId) {
                    DB::table('permission_role')->insertOrIgnore(['role_id' => $roleId, 'permission_id' => $permissionId]);
                }
            });
    }
};
