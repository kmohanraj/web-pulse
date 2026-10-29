import { useState } from 'react';

interface ImagePreviewProps {
  src: string | null;
  alt: string;
}

export function ImagePreview({ src, alt }: ImagePreviewProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="image-preview image-preview--empty" role="img" aria-label={alt || 'No preview'}>
        No preview
      </div>
    );
  }

  return (
    <img
      className="image-preview"
      src={src}
      alt={alt || 'Image preview'}
      onError={() => setFailed(true)}
    />
  );
}
