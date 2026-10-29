import { selectModuleConnections } from '@/app/connections';
import { useAppSelector } from '@/store/hooks';
import { LoadingState } from './LoadingState';

export function ModuleStatusList() {
  const modules = useAppSelector(selectModuleConnections);
  const running = modules.filter((item) => item.status === 'running');

  return (
    <section className="card module-status" aria-label="Module status">
      <header className="card__header">
        <h2>Module status</h2>
      </header>
      {running.length > 0 && <LoadingState label={`Running ${running.map((item) => item.label).join(', ')}`} />}
      <ul className="module-status__list">
        {modules.map((item) => (
          <li key={item.id} className={`module-status__item module-status__item--${item.status}`}>
            <span>{item.label}</span>
            <small>{item.error ?? item.status}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
