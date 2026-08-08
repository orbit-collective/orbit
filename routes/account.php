<?php

use App\Http\Controllers\UserController;

Route::middleware('auth')->group(function () {
   Route::post('/account/rename', [UserController::class, 'rename'])->name('account.rename');
   Route::post('/account/upload-avatar', [UserController::class, 'uploadAvatar'])->name('account.upload-avatar');
   Route::post('/account/reset-avatar', [UserController::class, 'resetAvatar'])->name('account.reset-avatar');
   Route::post('/account/change-password', [UserController::class, 'updatePassword'])->name('account.change-password');
});
