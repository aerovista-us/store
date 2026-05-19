import { withBase } from '../lib/withBase';

/**
 * Catalog console v2 (static HTML under /console/ after `npm run sync:console`).
 */
export function ConsoleFrame() {
  return (
    <div style={{ height: 'calc(100vh - 80px)', minHeight: 480, display: 'flex', flexDirection: 'column' }}>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>
        If this area is empty, run <code>npm run sync:console</code> or <code>npm run sync:all</code>, then reload.
        For background-removal APIs, run <code>npm run console:server</code> and open the console port directly.
      </p>
      <iframe
        title="AeroVista catalog console v2"
        src={withBase('console/aerovista_catalog_console_v2.html')}
        style={{
          flex: 1,
          width: '100%',
          minHeight: 420,
          border: '1px solid var(--border)',
          borderRadius: 12,
          background: '#0b1020',
        }}
      />
    </div>
  );
}
