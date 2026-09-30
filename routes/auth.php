<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\GithubAuthController;
use App\Http\Controllers\Auth\RegisteredUserController;

Route::middleware('guest')->group(function () {
    Route::get('/register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('/register', [RegisteredUserController::class, 'store']);

    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');
    Route::delete('/auth/github', [GithubAuthController::class, 'unlink'])->name('auth.github.unlink');
});

// Reachable by both guests (sign in) and authenticated users (link an account) - the
// controller itself branches on auth state, see GithubAuthController's docblock.
Route::get('/auth/github/redirect', [GithubAuthController::class, 'redirect'])->name('auth.github.redirect');
Route::get('/auth/github/callback', [GithubAuthController::class, 'callback'])->name('auth.github.callback');
