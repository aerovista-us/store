import { withBase } from '../lib/withBase';

const isOperatorMode = import.meta.env.VITE_OPERATOR_MODE === 'true';
const PRIVATE_CONSOLE_URL =
  import.meta.env.VITE_CONSOLE_URL || 'https://store-console.aerocoreos.com/';

export function CatalogHome() {
  return (
    <div>
      <h1 style={{ marginTop: 0, fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>AeroVista Store bridge</h1>
      <p style={{ color: 'var(--muted)', maxWidth: '42rem' }}>
        Local dev shell only. The <strong>public shop</strong> is published at{' '}
        <a href="https://gear.aerovista.us/">gear.aerovista.us</a> (GitHub Pages). The catalog console is{' '}
        <strong>not</strong> on Pages — it runs privately on NXCore.
      </p>
      <ul style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
        <li>
          <strong>Shop (customers):</strong>{' '}
          <a href={withBase('shop/index.html')}>Open storefront</a>
          {' '}
          <span style={{ opacity: 0.85 }}>
            — use this link; <code>npm run dev</code> alone does not show collection SVG changes.
          </span>
        </li>
        {isOperatorMode ? (
          <li>
            <strong>Catalog console (local dev):</strong>{' '}
            <a href={withBase('console/')}>Open in-app</a> — requires <code>npm run sync:console</code> and{' '}
            <code>VITE_OPERATOR_MODE=true</code>.
          </li>
        ) : (
          <li>
            <strong>Catalog console (operators):</strong>{' '}
            <a href={PRIVATE_CONSOLE_URL} rel="noopener noreferrer">
              {PRIVATE_CONSOLE_URL}
            </a>
          </li>
        )}
        <li>
          <strong>Deploy catalog to shop JSON:</strong> <code>npm run deploy:server</code> or{' '}
          <code>npm run deploy:catalog -- ./export.json</code>, then push and rebuild Pages.
        </li>
        <li>
          <strong>Public Pages build:</strong> <code>npm run build:pages</code> — storefront only, audited.
        </li>
      </ul>
    </div>
  );
}

