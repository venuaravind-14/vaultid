import React from 'react'

function DocumentsSection({ documents }) {
  return (
    <div className="section-view" id="view-documents">
      <div className="section-header">
        <h2>Documents</h2>
        <button className="btn btn-primary">
          <span style={{marginRight: '8px'}}>+</span>
          Add Document
        </button>
      </div>

      <div className="documents-grid">
        {documents.length === 0 ? (
          <div className="empty-state">
            <div style={{fontSize: '48px', marginBottom: '16px'}}>📄</div>
            <h3>No Documents Yet</h3>
            <p>Add your first document to get started</p>
            <button className="btn btn-primary" style={{marginTop: '16px'}}>
              Add Your First Document
            </button>
          </div>
        ) : (
          documents.map(doc => (
            <div key={doc.id} className="document-card">
              <div className="document-icon">📄</div>
              <div className="document-info">
                <div className="document-title">{doc.title || 'Document'}</div>
                <div className="document-date">{new Date(doc.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default DocumentsSection