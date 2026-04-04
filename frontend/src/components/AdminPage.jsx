import React from 'react'

function AdminPage({ user }) {
  return (
    <div id="admin-page" className="page active">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-user">
          <span>Welcome, {user.name}</span>
          <button className="btn btn-secondary">Sign Out</button>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-stats">
          <div className="stat-card">
            <h3>Total Users</h3>
            <div className="stat-number">0</div>
          </div>
          <div className="stat-card">
            <h3>Total Cards</h3>
            <div className="stat-number">0</div>
          </div>
          <div className="stat-card">
            <h3>Scan Logs</h3>
            <div className="stat-number">0</div>
          </div>
        </div>

        <div className="admin-sections">
          <div className="admin-section">
            <h2>User Management</h2>
            <p>Manage user accounts and permissions</p>
          </div>

          <div className="admin-section">
            <h2>Scan Logs</h2>
            <p>View card scanning activity</p>
          </div>

          <div className="admin-section">
            <h2>System Settings</h2>
            <p>Configure system preferences</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPage