import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { withBase } from './lib/withBase';
import { CatalogHome } from './routes/CatalogHome';
import { ConsoleFrame } from './routes/ConsoleFrame';

const isOperatorMode = import.meta.env.VITE_OPERATOR_MODE === 'true';
const PRIVATE_CONSOLE_URL =
  import.meta.env.VITE_CONSOLE_URL || 'https://store-console.aerocoreos.com/';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--panel)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <strong style={{ letterSpacing: '0.04em' }}>AeroVista Store</strong>
          <nav style={{ display: 'flex', gap: 20, fontSize: '0.9rem', alignItems: 'center' }}>
            <Link to="/">Home</Link>
            <a href={withBase('shop/index.html')}>Shop</a>
            {isOperatorMode ? (
              <Link to="/console/">Catalog console (local)</Link>
            ) : (
              <a href={PRIVATE_CONSOLE_URL} rel="noopener noreferrer">
                Catalog console (private)
              </a>
            )}
          </nav>
        </div>
      </header>
      <main style={{ flex: 1, width: '100%', maxWidth: 1120, margin: '0 auto', padding: '24px 20px 48px' }}>
        <Routes>
          <Route path="/" element={<CatalogHome />} />
          {isOperatorMode && <Route path="/console/*" element={<ConsoleFrame />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

