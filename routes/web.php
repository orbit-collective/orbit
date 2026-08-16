<?php

use App\Http\Controllers\CommentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\IssueController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\SavedFilterController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/projects/{project}/issues/{issue}', [IssueController::class, 'show'])->name('issues.show');
    Route::delete('/issues/bulk-destroy', [IssueController::class, 'bulkDestroy'])->name('issues.bulk-destroy');
    Route::post('/issues/{issue}/comments', [CommentController::class, 'store'])->name('comments.store');
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy'])->name('comments.destroy');
    Route::patch('/issues/{issue}', [IssueController::class, 'update'])->name('issues.update');
    Route::delete('/issues/{issue}', [IssueController::class, 'destroy'])->name('issues.destroy');
    Route::post('/issues', [IssueController::class, 'store'])->name('issues.store');
    Route::get('/projects', [ProjectController::class, 'index'])->name('projects.index');
    Route::get('/projects/{project}', [ProjectController::class, 'show'])->name('projects.show');
    Route::post('/projects', [ProjectController::class, 'store'])->name('projects.store');
    Route::patch('/projects/{project}/columns', [ProjectController::class, 'updateColumns'])->name('projects.columns.update');
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

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
    ]);
});

require __DIR__.'/auth.php';
require __DIR__.'/account.php';
