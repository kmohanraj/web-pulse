import type { LinkCheckResult } from '../types';

interface LinkResultTableProps {
  results: LinkCheckResult[];
}

export function LinkResultTable({ results }: LinkResultTableProps) {
  if (results.length === 0) {
    return <p className="link-table__empty">No links match this filter.</p>;
  }

  return (
    <div className="link-table-wrap">
      <table className="link-table">
        <thead>
          <tr>
            <th>Kind</th>
            <th>Link</th>
            <th>Status</th>
            <th>Final</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.id}>
              <td>{result.kind}</td>
              <td>
                <span className="link-table__text">{result.text || 'Untitled link'}</span>
                <code className="link-table__url">{result.url}</code>
              </td>
              <td>
                <StatusCode code={result.status} />
              </td>
              <td>{result.finalStatus ?? '—'}</td>
              <td>{result.error ?? result.outcome}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusCode({ code }: { code: number | null }) {
  if (code === null) {
    return <span className="status-code">—</span>;
  }
  return <span className={`status-code status-code--${code}`}>{code}</span>;
}
