import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import './styles.css'
import './commerce.css'
import './simple-store.css'
import './admin-portal.css'

const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/'
const isAdmin = normalizedPath.endsWith('/admin') || window.location.hash === '#/admin' || new URLSearchParams(window.location.search).get('admin') === '1'
const Root = isAdmin ? AdminPanel : App

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
