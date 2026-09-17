<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\AttachmentService;
use App\Services\NsfwDetectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class AttachmentController extends Controller
{
    public function __construct(
        protected AttachmentService $attachmentService
    ) {}

    /**
     * Unlike every other mutating endpoint in the app this one answers with
     * JSON rather than a redirect: the caller is the Tiptap editor's
     * paste/drop handler, which needs the stored URL back to insert an image
     * node - there is no page re-render to hang the result off.
     */
    public function store(Request $request, Project $project, NsfwDetectionService $nsfwDetection): JsonResponse
    {
        $this->authorize('uploadAttachments', $project);

        $request->validate([
            'file' => [
                'required',
                'image',
                'mimes:jpeg,png,gif,webp',
                'max:5120',
            ],
        ]);

        $file = $request->file('file');

        try {
            $isValid = $nsfwDetection->validate($file);
        } catch (Throwable $e) {
            Log::error('NSFW detection service failure during attachment upload: '.$e->getMessage(), [
                'exception' => $e,
                'project_id' => $project->id,
                'user_id' => $request->user()?->id,
            ]);

            return response()->json([
                'message' => 'Unable to verify image safety right now. Please try again later.',
            ], 503);
        }

        if (! $isValid) {
            return response()->json([
                'message' => 'This image cannot be used.',
            ], 422);
        }

        $attachment = $this->attachmentService->storeImage($project, $file, $request->user());

        return response()->json([
            'url' => $attachment->url,
            'name' => $attachment->original_name,
        ], 201);
    }
}
