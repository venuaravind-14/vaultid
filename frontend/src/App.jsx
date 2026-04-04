import React, { useState, useEffect } from 'react'
import AuthPage from './components/AuthPage.jsx'
import AppPage from './components/AppPage.jsx'
import AdminPage from './components/AdminPage.jsx'
import { api } from './services/api.js'
import { crypto_vault } from './services/crypto.js'
import './App.css'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [currentSection, setCurrentSection] = useState('cards')
  const [allCards, setAllCards] = useState([])
  const [allDocs, setAllDocs] = useState([])
  const [allFiles, setAllFiles] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [qrInstances, setQrInstances] = useState({})

  // Initialize app
  useEffect(() => {
    // Check for Google OAuth callback
    const googleCallback = api.handleGoogleCallback()
    if (googleCallback) {
      setCurrentUser(googleCallback.user)
      crypto_vault.setKey('google-oauth-' + Date.now())
      sessionStorage.setItem('vaultid_key', crypto_vault.key)
      return
    }

    // Check stored session
    const token = localStorage.getItem('vaultid_token')
    const storedUser = localStorage.getItem('vaultid_user')
    const storedPw = sessionStorage.getItem('vaultid_key')

    if (token && storedUser && storedPw) {
      setCurrentUser(JSON.parse(storedUser))
      api.token = token
      crypto_vault.setKey(storedPw)
    }
  }, [])

  const showPage = (pageId) => {
    // This will be handled by React routing/state
  }

  const showApp = () => {
    if (currentUser?.role === 'admin') {
      showPage('admin-page')
    } else {
      showPage('app-page')
      navigateTo('cards')
    }
  }

  const navigateTo = (section) => {
    setCurrentSection(section)
    if (section === 'cards') loadCards()
    if (section === 'documents') loadDocuments()
  }

  const loadCards = async () => {
    try {
      const data = await api.getCards()
      setAllCards(data)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const loadDocuments = async () => {
    try {
      const data = await api.getDocs()
      setAllDocs(data)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const toast = (msg, type = 'success') => {
    // Toast implementation
    console.log(`${type}: ${msg}`)
  }

  const handleLogin = async (email, password) => {
    try {
      const data = await api.login(email, password)
      api.token = data.token
      setCurrentUser(data.user)
      localStorage.setItem('vaultid_user', JSON.stringify(data.user))
      sessionStorage.setItem('vaultid_key', password)
      crypto_vault.setKey(password)
      toast('Welcome back, ' + data.user.name + '!')
      showApp()
    } catch (e) {
      toast(e.message, 'error')
      throw e
    }
  }

  const handleRegister = async (name, email, password) => {
    try {
      const data = await api.register(name, email, password)
      api.token = data.token
      setCurrentUser(data.user)
      localStorage.setItem('vaultid_user', JSON.stringify(data.user))
      sessionStorage.setItem('vaultid_key', password)
      crypto_vault.setKey(password)
      toast('Account created! Welcome, ' + name)
      showApp()
    } catch (e) {
      toast(e.message, 'error')
      throw e
    }
  }

  const googleLogin = () => {
    api.loginWithGoogle()
  }

  const logout = () => {
    localStorage.removeItem('vaultid_token')
    localStorage.removeItem('vaultid_user')
    sessionStorage.removeItem('vaultid_key')
    api.token = null
    setCurrentUser(null)
    setAllCards([])
    setAllDocs([])
    setAllFiles([])
    toast('Signed out')
  }

  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} onRegister={handleRegister} onGoogleLogin={googleLogin} />
  }

  if (currentUser.role === 'admin') {
    return <AdminPage user={currentUser} />
  }

  return (
    <AppPage
      user={currentUser}
      currentSection={currentSection}
      allCards={allCards}
      allDocs={allDocs}
      allFiles={allFiles}
      activeFilter={activeFilter}
      onNavigate={navigateTo}
      onLogout={logout}
    />
  )
}

export default App