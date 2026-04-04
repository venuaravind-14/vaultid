import React from 'react'

function FilesSection({ files }) {
  return (
    <div className="section-view" id="view-files">
      <div className="section-header">
        <h2>Files</h2>
        <button className="btn btn-primary">
          <span style={{marginRight: '8px'}}>+</span>
          Upload File
        </button>
      </div>

      <div className="files-grid">
        {files.length === 0 ? (
          <div className="empty-state">
            <div style={{fontSize: '48px', marginBottom: '16px'}}>📁</div>
            <h3>No Files Yet</h3>
            <p>Upload your first file to get started</p>
            <button className="btn btn-primary" style={{marginTop: '16px'}}>
              Upload Your First File
            </button>
          </div>
        ) : (
          files.map(file => (
            <div key={file.id} className="file-card">
              <div className="file-icon">📄</div>
              <div className="file-info">
                <div className="file-name">{file.filename}</div>
                <div className="file-size">{file.size} bytes</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default FilesSection