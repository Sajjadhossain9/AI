import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import './styles.css'
import './commerce.css'

const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/'
const Root = normalizedPath === '/admin' ? AdminPanel : App

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
