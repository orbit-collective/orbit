<?php

namespace App\Services;

use App\Models\Attachment;
use App\Models\Project;
use App\Models\User;
use App\Repositories\AttachmentRepository;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Throwable;

class AttachmentService
{
    public function __construct(
        protected AttachmentRepository $attachmentRepository
    ) {}

    /**
     * Stores an uploaded image on the public disk and records it against the
     * project, so the markdown body only ever has to carry the returned URL.
     */
    public function storeImage(Project $project, UploadedFile $file, User $uploader): Attachment
    {
        $path = $file->store("attachments/{$project->id}", 'public');

        try {
            return $this->attachmentRepository->create($project, [
                'user_id' => $uploader->id,
                'disk' => 'public',
                'path' => $path,
                'url' => Storage::url($path),
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]);
        } catch (Throwable $e) {
            // The file is written before the row exists, so a failed insert
            // would otherwise leave an untracked file on a public disk with
            // nothing left pointing at it.
            Storage::disk('public')->delete($path);

            throw $e;
        }
    }

    public function delete(Attachment $attachment): void
    {
        Storage::disk($attachment->disk)->delete($attachment->path);

        $this->attachmentRepository->delete($attachment);
    }
}
