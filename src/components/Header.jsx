import { Sprout } from 'lucide-react';

function Header({ modelStatus, loadingProgress }) {
  const isModelReady = modelStatus === 'Model AI Siap';

  return (
    <header className="header" style={{ position: 'relative' }}>
      <div className="header-content">
        <div className="logo">
          <Sprout size={20} />
          <span>RootFacts</span>
        </div>

        <div className="status-pill">
          <span className={`status-dot ${isModelReady ? 'active' : ''}`}></span>
          <span>{modelStatus}</span>
        </div>
      </div>

      {loadingProgress > 0 && loadingProgress < 100 && (
        <div className="progress-bar-container" style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: '#f1f5f9',
          overflow: 'hidden'
        }}>
          <div className="progress-bar-fill" style={{
            width: `${loadingProgress}%`,
            height: '100%',
            background: 'var(--primary)',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}></div>
        </div>
      )}
    </header>
  );
}

export default Header;
