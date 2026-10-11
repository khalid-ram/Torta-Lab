import { IsIn } from 'class-validator';
import { ALLOWED_IMAGE_MIME_TYPES, ALLOWED_VIDEO_MIME_TYPES } from '../upload-constraints';

// Requested before the browser uploads anything — see baked-cakes.service.ts
// requestUploadUrl(). "purpose" picks the storage folder (thumbnails are
// always an image, regardless of the cake's own media type); "fileKind"
// and "contentType" only pick a file extension for the generated path.
// Neither is trusted for security — the actual bytes are re-validated
// server-side from Storage after the upload completes, before any
// baked_cakes row is created or updated.
export class RequestUploadUrlDto {
  @IsIn(['media', 'thumbnail'])
  purpose!: 'media' | 'thumbnail';

  @IsIn(['image', 'video'])
  fileKind!: 'image' | 'video';

  @IsIn([...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_VIDEO_MIME_TYPES])
  contentType!: string;
}
