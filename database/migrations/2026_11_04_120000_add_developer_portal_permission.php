<?php

use App\Enums\Permissions\Permission as PermissionEnum;
use App\Models\Permission;
use App\Support\Cache\CacheVersion;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Creates the developer.portal.view permission and grants it to the
     * Owner and Admin system roles that already exist (new permissions are
     * not topped up automatically). Member, Viewer and custom roles are left
     * alone. Additive and idempotent.
     */
    public function up(): void
    {
        $permission = Permission::query()->updateOrCreate(
            ['key' => PermissionEnum::DEVELOPER_PORTAL_VIEW->value],
            ['name' => PermissionEnum::DEVELOPER_PORTAL_VIEW->name, 'group' => 'developer'],
        );

        DB::table('roles')
            ->where('is_system', true)
            ->whereIn('role', ['owner', 'admin'])
            ->pluck('id')
            ->each(fn (int $roleId) => DB::table('permission_role')->insertOrIgnore([
                'role_id' => $roleId,
                'permission_id' => $permission->id,
            ]));

        $this->retireCachedAccess();
    }

    public function down(): void
    {
        $id = Permission::query()->where('key', PermissionEnum::DEVELOPER_PORTAL_VIEW->value)->value('id');

        if ($id !== null) {
            DB::table('permission_role')->where('permission_id', $id)->delete();
            Permission::query()->whereKey($id)->delete();
        }

        // Cached memberships list the permissions each role grants: retire them
        // so a rolled-back grant stops working at once, not after the TTL.
        $this->retireCachedAccess();
    }

    private function retireCachedAccess(): void
    {
        try {
            CacheVersion::bump(CacheVersion::MEMBERSHIP);
        } catch (Throwable) {
            // The cache may be unreachable while migrating; entries age out via their TTL.
        }
    }
};
