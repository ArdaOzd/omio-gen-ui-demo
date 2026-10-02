import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { GenerativeRoute, GenerativeChooser } from './generative/routes.tsx'

const path=window.location.pathname
if(path==='/a'||path==='/b')createRoot(document.getElementById('root')).render(<GenerativeRoute variant={path==='/a'?'a':'b'}/>)
else if(path==='/generative')createRoot(document.getElementById('root')).render(<GenerativeChooser/>)
else createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
