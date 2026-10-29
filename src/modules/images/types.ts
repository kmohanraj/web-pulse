export type ImageIssueCode = 'empty_src' | 'missing_alt' | 'broken' | 'forbidden' | 'not_found';

export type ImageStatus = ImageIssueCode | 'ok';

export interface CollectedImage {
  src: string;
  currentSrc: string;
  alt: string | null;
  altMissing: boolean;
  complete: boolean;
  naturalWidth: number;
  naturalHeight: number;
  broken: boolean;
}

export interface ImageCheckResult {
  id: string;
  src: string;
  previewUrl: string | null;
  alt: string | null;
  statusCode: number | null;
  status: ImageStatus;
  issues: ImageIssueCode[];
  recommendation: string;
  width: number;
  height: number;
}

export interface ImageValidationPayload {
  pageUrl: string;
  results: ImageCheckResult[];
  skipped: number;
}

export interface ImagesState {
  status: 'idle' | 'running' | 'succeeded' | 'failed';
  error: string | null;
  pageUrl: string | null;
  results: ImageCheckResult[];
  skipped: number;
  filter: ImageStatus | 'all';
}

export interface CollectImagesRequest {
  type: 'WEBPULSE_COLLECT_IMAGES';
}

export type CollectImagesResponse =
  | { ok: true; pageUrl: string; images: CollectedImage[] }
  | { ok: false; error: string };
