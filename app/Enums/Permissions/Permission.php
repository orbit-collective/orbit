<?php

namespace App\Enums\Permissions;

enum Permission: string
{
// WORKSPACE PERMISSIONS
    case WORKSPACE_VIEW = 'workspace.view';
    case WORKSPACE_UPDATE = 'workspace.update';
    case WORKSPACE_DELETE = 'workspace.delete';

    case MEMBERS_VIEW = 'workspace.members.view';
    case MEMBERS_INVITE = 'workspace.members.invite';
    case MEMBERS_UPDATE = 'workspace.members.update';
    case MEMBERS_DELETE = 'workspace.members.delete';

    case ROLES_VIEW = 'workspace.roles.view';
    case ROLES_CREATE = 'workspace.roles.create';
    case ROLES_UPDATE = 'workspace.roles.update';
    case ROLES_DELETE = 'workspace.roles.delete';
    case ROLES_ASSIGN = 'workspace.roles.assign';

    case SETTINGS_VIEW = 'workspace.settings.view';
    case SETTINGS_UPDATE = 'workspace.settings.update';

// PROJECTS PERMISSIONS
    case PROJECTS_VIEW = 'projects.view';
    case PROJECTS_CREATE = 'projects.create';
    case PROJECTS_UPDATE = 'projects.update';
    case PROJECTS_DELETE = 'projects.delete';

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
