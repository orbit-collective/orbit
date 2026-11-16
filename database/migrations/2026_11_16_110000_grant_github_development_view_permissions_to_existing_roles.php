<?php

use App\Enums\Permissions\Permission as PermissionEnum;
use App\Models\Permission;
use App\Support\Cache\CacheVersion;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const array KEYS = [
        PermissionEnum::GITHUB_DEVELOPMENT_VIEW,
        PermissionEnum::GITHUB_DEVELOPMENT_MANAGE,
    ];

    /**
     * New permissions are not granted to roles that already exist, so the
     * Development view's two are added here: both to Owner, Admin and
     * Member (who can already create branches and pull requests from an
     * issue), view only to Viewer. Additive and idempotent; custom roles
     * are left alone.
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

        $this->grant(['owner', 'admin', 'member'], $ids->all());
        $this->grant(['viewer'], [$ids[PermissionEnum::GITHUB_DEVELOPMENT_VIEW->value]]);

        try {
            CacheVersion::bump(CacheVersion::MEMBERSHIP);
        } catch (Throwable) {
            // The cache may be unreachable while migrating; entries age out via their TTL.
        }
    }

    public function down(): void
    {
        $ids = Permission::query()
            ->whereIn('key', array_map(fn (PermissionEnum $permission) => $permission->value, self::KEYS))
            ->pluck('id');

        DB::table('permission_role')->whereIn('permission_id', $ids)->delete();
    }

    /** @param  list<int>  $permissionIds */
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
