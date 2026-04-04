import React from 'react'

function Sidebar({ user, currentSection, onNavigate, onLogout }) {
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-name">{user.name}</div>
            <div className="sidebar-email">{user.email}</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${currentSection === 'cards' ? 'active' : ''}`}
          onClick={() => onNavigate('cards')}
        >
          <span className="nav-icon">💳</span>
          <span className="nav-text">ID Cards</span>
        </button>

        <button
          className={`nav-item ${currentSection === 'documents' ? 'active' : ''}`}
          onClick={() => onNavigate('documents')}
        >
          <span className="nav-icon">📄</span>
          <span className="nav-text">Documents</span>
        </button>

        <button
          className={`nav-item ${currentSection === 'files' ? 'active' : ''}`}
          onClick={() => onNavigate('files')}
        >
          <span className="nav-icon">📁</span>
          <span className="nav-text">Files</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <button className="btn btn-secondary btn-full" onClick={onLogout}>
          <span style={{marginRight: '8px'}}>🚪</span>
          Sign Out
        </button>
      </div>
    </aside>
  )
}

export default Sidebar