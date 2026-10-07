import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './shadcn.css'
import './styles.css'
import './generative/omio-theme.css'
const GenerativeRoute=lazy(()=>import('./generative/routes.tsx').then(module=>({default:module.GenerativeRoute})))
const TripPlanningFixture=lazy(()=>import('./generative/testing/trip-planning-fixture.tsx').then(module=>({default:module.TripPlanningFixture})))
const loading=<p role="status">Opening your travel conversation…</p>

let path=window.location.pathname
if(path==='/b'||path==='/study'){
  window.history.replaceState({},'',`/a${window.location.search}${window.location.hash}`)
  path='/a'
}
if(path==='/trip-planning-fixture')createRoot(document.getElementById('root')).render(<Suspense fallback={loading}><TripPlanningFixture/></Suspense>)
else if(path==='/a'||path==='/generative')createRoot(document.getElementById('root')).render(<Suspense fallback={loading}><GenerativeRoute/></Suspense>)
else createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
