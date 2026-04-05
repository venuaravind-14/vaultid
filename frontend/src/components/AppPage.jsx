import React from 'react'
import Sidebar from './Sidebar.jsx'
import CardsSection from './CardsSection.jsx'
import DocumentsSection from './DocumentsSection.jsx'
import FilesSection from './FilesSection.jsx'

function AppPage({ user, currentSection, allCards, allDocs, allFiles, activeFilter, onNavigate, onLogout }) {
  const renderSection = () => {
    switch (currentSection) {
      case 'cards':
        return <CardsSection cards={allCards} />
      case 'documents':
        return <DocumentsSection documents={allDocs} />
      case 'files':
        return <FilesSection files={allFiles} />
      default:
        return <CardsSection cards={allCards} />
    }
  }

  return (
    <div id="app-page" className="page active">
      <Sidebar
        user={user}
        currentSection={currentSection}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      <main className="main-content">
        {renderSection()}
      </main>
    </div>
  )
}

export default AppPage