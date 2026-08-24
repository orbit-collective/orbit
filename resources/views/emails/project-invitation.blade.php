@extends('emails.layout')

@section('subject', "You've been invited to join \"$project->name\" on Orbit")

@section('content')
    <h1 style="margin:0 0 16px; font-size:20px; line-height:28px; color:#f7f7f8;">Hello!</h1>

    <p style="margin:0 0 24px; color:#f7f7f8;">{{ $invitedBy->name }} invited you to join the "{{ $project->name }}" project on Orbit.</p>

    @include('emails.partials.button', ['url' => $acceptUrl, 'text' => 'Accept invitation'])

    <p style="margin:0; font-size:13px; color:#8a8f98;">This invitation link can only be used once and expires in 7 days.</p>
@endsection
