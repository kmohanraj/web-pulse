import { ImageValidationPanel } from '@/modules/images';

export function ImagesPage() {
  return (
    <div className="page">
      <section className="page__intro">
        <h2>Images</h2>
        <p>Preview each image, then review its status and the recommended fix.</p>
      </section>
      <ImageValidationPanel />
    </div>
  );
}
