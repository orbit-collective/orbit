<?php

namespace App\Enums\Permissions;

enum RoleType: string
{
    case OWNER = 'owner';
    case ADMIN = 'admin';
    case MEMBER = 'member';
    case VIEWER = 'viewer';
    case CUSTOM = 'custom';
}
