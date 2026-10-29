import type { ReactNode } from 'react';

interface PageFrameProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function PageFrame({ title, description, children }: PageFrameProps) {
  return (
    <div className="page">
      <section className="page__intro">
        <h2>{title}</h2>
        <p>{description}</p>
      </section>
      {children}
    </div>
  );
}
