<?php

namespace App\Enums\Permissions;

enum Permission: string
{
    // PROJECT PERMISSIONS
    case PROJECT_VIEW = 'projects.view';
    case PROJECT_CREATE = 'projects.create';
    case PROJECT_UPDATE = 'projects.update';
    case PROJECT_DELETE = 'projects.delete';

    case MEMBERS_VIEW = 'projects.members.view';
    case MEMBERS_INVITE = 'projects.members.invite';
    case MEMBERS_UPDATE = 'projects.members.update';
    case MEMBERS_DELETE = 'projects.members.delete';

    case ROLES_VIEW = 'projects.roles.view';
    case ROLES_CREATE = 'projects.roles.create';
    case ROLES_UPDATE = 'projects.roles.update';
    case ROLES_DELETE = 'projects.roles.delete';
    case ROLES_ASSIGN = 'projects.roles.assign';

    case SETTINGS_VIEW = 'projects.settings.view';
    case SETTINGS_UPDATE = 'projects.settings.update';

    case INTEGRATIONS_VIEW = 'projects.integrations.view';
    case INTEGRATIONS_UPDATE = 'projects.integrations.update';

    // ISSUES PERMISSIONS
    case ISSUES_VIEW = 'issues.view';
    case ISSUES_CREATE = 'issues.create';
    case ISSUES_UPDATE = 'issues.update';
    case ISSUES_DELETE = 'issues.delete';
    case ISSUES_ASSIGN = 'issues.assign';
    case ISSUES_CHANGE_STATUS = 'issues.change_status';
    case ISSUES_CHANGE_PRIORITY = 'issues.change_priority';
    case ISSUES_CHANGE_LABELS = 'issues.change_labels';

    // COMMENTS PERMISSIONS
    case COMMENTS_CREATE = 'comments.create';
    case COMMENTS_UPDATE_OWN = 'comments.update_own';
    case COMMENTS_UPDATE_ANY = 'comments.update_any';
    case COMMENTS_DELETE_OWN = 'comments.delete_own';
    case COMMENTS_DELETE_ANY = 'comments.delete_any';
}
