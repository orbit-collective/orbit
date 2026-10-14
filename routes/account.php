<?php

use App\Http\Controllers\NotificationRetentionController;
use App\Http\Controllers\NotificationSettingController;
use App\Http\Controllers\UserController;

Route::middleware('auth')->group(function () {
    Route::post('/account/rename', [UserController::class, 'rename'])->name('account.rename');
    Route::post('/account/upload-avatar', [UserController::class, 'uploadAvatar'])->name('account.upload-avatar');
    Route::post('/account/reset-avatar', [UserController::class, 'resetAvatar'])->name('account.reset-avatar');
    Route::post('/account/change-password', [UserController::class, 'updatePassword'])->name('account.change-password');
    Route::delete('/account/sessions/{session}', [UserController::class, 'revokeSession'])->name('account.sessions.revoke');
    Route::delete('/account/sessions', [UserController::class, 'revokeOtherSessions'])->name('account.sessions.revoke-others');
    Route::post('/account/session-lifetime/{lifetime}', [UserController::class, 'updateSessionLifetime'])->name('account.session-lifetime.update');
    Route::delete('/account/delete', [UserController::class, 'deleteAccount'])->name('account.delete');
    Route::post('/account/notification-settings', [NotificationSettingController::class, 'update'])->name('account.notification-settings.update');
    Route::post('/account/notification-retention', [NotificationRetentionController::class, 'update'])->name('account.notification-retention.update');
    Route::post('/account/notification-retention/purge', [NotificationRetentionController::class, 'purge'])->name('account.notification-retention.purge');
});
