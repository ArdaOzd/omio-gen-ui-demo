import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
const GenerativeRoute=lazy(()=>import('./generative/routes.tsx').then(module=>({default:module.GenerativeRoute})))
const GenerativeChooser=lazy(()=>import('./generative/routes.tsx').then(module=>({default:module.GenerativeChooser})))
const Study=lazy(()=>import('./generative/experiments/study.tsx').then(module=>({default:module.Study})))
const loading=<p role="status">Opening your travel conversation…</p>

const path=window.location.pathname
if(path==='/a'||path==='/b')createRoot(document.getElementById('root')).render(<Suspense fallback={loading}><GenerativeRoute variant={path==='/a'?'a':'b'}/></Suspense>)
else if(path==='/study')createRoot(document.getElementById('root')).render(<Suspense fallback={loading}><Study/></Suspense>)
else if(path==='/generative')createRoot(document.getElementById('root')).render(<Suspense fallback={loading}><GenerativeChooser/></Suspense>)
else createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
