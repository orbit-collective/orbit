<?php

use App\Http\Controllers\CommentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\IssueController;
use App\Http\Controllers\JiraIntegrationController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectIntegrationController;
use App\Http\Controllers\ProjectInvitationController;
use App\Http\Controllers\ProjectMemberController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SavedFilterController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/projects/{project}/issues/{issue}', [IssueController::class, 'show'])->name('issues.show');
    Route::delete('/issues/bulk-destroy', [IssueController::class, 'bulkDestroy'])->name('issues.bulk-destroy');
    Route::post('/issues/{issue}/comments', [CommentController::class, 'store'])->name('comments.store');
    Route::patch('/comments/{comment}', [CommentController::class, 'update'])->name('comments.update');
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy'])->name('comments.destroy');
    Route::patch('/issues/{issue}', [IssueController::class, 'update'])->name('issues.update');
    Route::delete('/issues/{issue}', [IssueController::class, 'destroy'])->name('issues.destroy');
    Route::post('/issues', [IssueController::class, 'store'])->name('issues.store');
    Route::get('/projects', [ProjectController::class, 'index'])->name('projects.index');
    Route::get('/projects/{project}', [ProjectController::class, 'show'])->name('projects.show');
    Route::post('/projects', [ProjectController::class, 'store'])->name('projects.store');
    Route::patch('/projects/{project}/columns', [ProjectController::class, 'updateColumns'])->name('projects.columns.update');
    Route::patch('/projects/{project}/details', [ProjectController::class, 'updateDetails'])->name('projects.details.update');
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');
    Route::patch('/projects/{project}/members/{user}', [ProjectMemberController::class, 'updateRole'])->name('projects.members.update-role');
    Route::delete('/projects/{project}/members/{user}', [ProjectMemberController::class, 'destroy'])->name('projects.members.destroy');
    Route::patch('/projects/{project}/members/{user}/roles', [ProjectMemberController::class, 'syncRoles'])->name('projects.members.roles.update');
    Route::patch('/projects/{project}/transfer-ownership', [ProjectMemberController::class, 'transferOwnership'])->name('projects.transfer-ownership');
    Route::post('/projects/{project}/roles', [RoleController::class, 'store'])->name('projects.roles.store');
    Route::patch('/projects/{project}/roles/{role}', [RoleController::class, 'update'])->name('projects.roles.update');
    Route::patch('/projects/{project}/roles/{role}/permissions', [RoleController::class, 'syncPermissions'])->name('projects.roles.permissions.update');
    Route::delete('/projects/{project}/roles/{role}', [RoleController::class, 'destroy'])->name('projects.roles.destroy');
    Route::patch('/projects/{project}/integrations/{integration}', [ProjectIntegrationController::class, 'update'])->name('projects.integrations.update');
    Route::patch('/projects/{project}/integrations/{integration}/settings', [ProjectIntegrationController::class, 'updateSettings'])->name('projects.integrations.settings.update');
    Route::post('/projects/{project}/integrations/jira/connect', [JiraIntegrationController::class, 'connect'])->name('projects.integrations.jira.connect');
    Route::put('/projects/{project}/integrations/jira/mappings', [JiraIntegrationController::class, 'updateMappings'])->name('projects.integrations.jira.mappings.update');
    Route::post('/projects/{project}/integrations/jira/import', [JiraIntegrationController::class, 'import'])->name('projects.integrations.jira.import');
    Route::post('/projects/{project}/invitations', [ProjectInvitationController::class, 'store'])->name('projects.invitations.store');
    Route::delete('/projects/{project}/invitations/{invitation}', [ProjectInvitationController::class, 'destroy'])->name('projects.invitations.destroy');
    Route::post('/invitations/accept', [ProjectInvitationController::class, 'acceptManual'])->name('invitations.accept-manual');
    Route::post('/saved-filters', [SavedFilterController::class, 'store'])->name('saved-filters.store');
    Route::delete('/saved-filters/{savedFilter}', [SavedFilterController::class, 'destroy'])->name('saved-filters.destroy');
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy'])->name('notifications.destroy');
    Route::post('/notifications/{notification}', [NotificationController::class, 'update'])->name('notifications.update');
    Route::post('/onboarding/complete', [UserController::class, 'completeOnboarding'])->name('onboarding.complete');
    Route::post('/onboarding/project/complete', [UserController::class, 'completeProjectOnboarding'])->name('onboarding.project.complete');
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings');
});

Route::get('/invitations/{token}', [ProjectInvitationController::class, 'accept'])->name('invitations.accept');

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
    ]);
});

require __DIR__.'/auth.php';
require __DIR__.'/account.php';
