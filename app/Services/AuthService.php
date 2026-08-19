<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Auth;

class AuthService
{
    public function __construct(
        protected UserRepository $userRepository
    ) {}

    public function register(array $data): User
    {
        $data['role'] = $this->userRepository->hasAnyUsers() ? UserRole::MEMBER : UserRole::ADMIN;

        $user = $this->userRepository->create($data);

        event(new Registered($user));

        Auth::login($user);

        return $user;
    }

    public function attempt(array $credentials, bool $remember = false): bool
    {
        return Auth::attempt($credentials, $remember);
    }
}
