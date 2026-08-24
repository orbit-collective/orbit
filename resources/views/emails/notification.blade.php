@extends('emails.layout')

@section('subject', $title)

@section('content')
    <h1 style="margin:0 0 16px; font-size:20px; line-height:28px; color:#f7f7f8;">Hello {{ $notifiable->name }}!</h1>

    <p style="margin:0 0 24px; color:#f7f7f8;">{{ $body }}</p>

    @if($actionUrl)
        @include('emails.partials.button', ['url' => $actionUrl, 'text' => 'View in Orbit'])
    @endif
@endsection
