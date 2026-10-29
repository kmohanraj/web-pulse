import type { CollectedImage } from '@/modules/images/types';

const IMAGE_WAIT_MS = 4000;

export async function collectPageImages(doc: Document): Promise<CollectedImage[]> {
  const images = Array.from(doc.querySelectorAll<HTMLImageElement>('img'));
  const broken = await Promise.all(images.map((image) => imageFailedToLoad(image)));
  return images.map((image, index) => toCollectedImage(image, broken[index] ?? false));
}

function toCollectedImage(image: HTMLImageElement, broken: boolean): CollectedImage {
  const src = (image.getAttribute('src') ?? '').trim();
  const currentSrc = image.currentSrc || src;
  const altMissing = !image.hasAttribute('alt');

  return {
    src,
    currentSrc,
    alt: altMissing ? null : (image.getAttribute('alt') ?? ''),
    altMissing,
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    broken,
  };
}

async function imageFailedToLoad(image: HTMLImageElement): Promise<boolean> {
  const src = (image.currentSrc || image.getAttribute('src') || '').trim();
  if (src === '') {
    return false;
  }
  await waitForImage(image);
  if (image.naturalWidth > 0 || image.naturalHeight > 0) {
    return false;
  }
  // Zero intrinsic size is not enough: SVG files and lazy images can display without it.
  // Broken means this URL does not load.
  return !(await resourceLoads(src));
}

function resourceLoads(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = new Image();
    let settled = false;
    const finish = (loaded: boolean): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(loaded);
    };
    probe.addEventListener('load', () => finish(true), { once: true });
    probe.addEventListener('error', () => finish(false), { once: true });
    probe.src = src;
    window.setTimeout(() => finish(probe.complete && (probe.naturalWidth > 0 || probe.naturalHeight > 0)), IMAGE_WAIT_MS);
  });
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete || (image.getAttribute('src') ?? '').trim() === '') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const finish = (): void => {
      image.removeEventListener('load', finish);
      image.removeEventListener('error', finish);
      resolve();
    };
    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', finish, { once: true });
    window.setTimeout(finish, IMAGE_WAIT_MS);
  });
}
