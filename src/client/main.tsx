import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App'
import { StoreProvider } from './store'
import { apiBaseUrl } from './lib/tauriEnv'

if (apiBaseUrl) axios.defaults.baseURL = apiBaseUrl

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </React.StrictMode>
)
