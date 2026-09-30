<?php

namespace App\Services;

use App\Models\Attachment;
use App\Models\Project;
use App\Models\User;
use App\Repositories\AttachmentRepository;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class AttachmentService
{
    public function __construct(
        protected AttachmentRepository $attachmentRepository
    ) {}

    /**
     * Stores an uploaded image on the private 'local' disk and serves it
     * exclusively through the authorized `projects.attachments.show` route,
     * so every read re-checks project membership rather than reaching a
     * world-readable /storage/... URL (see GitHub issue #273). The route
     * needs the attachment's own id, so the row is created first (with a
     * placeholder url) and updated with the real url right after - both
     * writes share one transaction, so a failure in either one never leaves
     * a row with an empty url behind.
     */
    public function storeImage(Project $project, UploadedFile $file, User $uploader): Attachment
    {
        $path = $file->store("attachments/$project->id", 'local');

        try {
            return DB::transaction(function () use ($project, $uploader, $file, $path) {
                $attachment = $this->attachmentRepository->create($project, [
                    'user_id' => $uploader->id,
                    'disk' => 'local',
                    'path' => $path,
                    'url' => '',
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ]);

                return $this->attachmentRepository->update($attachment, [
                    'url' => route('projects.attachments.show', [$project, $attachment]),
                ]);
            });
        } catch (Throwable $e) {
            // The file is written before the row exists, so a failed insert
            // or url update would otherwise leave an untracked file on disk
            // with nothing left pointing at it.
            Storage::disk('local')->delete($path);

            throw $e;
        }
    }

    public function delete(Attachment $attachment): void
    {
        Storage::disk($attachment->disk)->delete($attachment->path);

        $this->attachmentRepository->delete($attachment);
    }
}
