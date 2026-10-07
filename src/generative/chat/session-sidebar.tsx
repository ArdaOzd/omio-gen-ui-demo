import { PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { orderedSessions, type SessionSummary } from './session-history'

export type SessionSidebarProps = {
  sessions: SessionSummary[]
  activeSessionId: string
  collapsed: boolean
  switching?: boolean
  onNew: () => void
  onSelect: (id: string) => void
  onCollapsedChange: (collapsed: boolean) => void
}

export function SessionSidebar(props: SessionSidebarProps) {
  return <aside className="travel-session-sidebar" aria-label="Chat sessions" data-collapsed={props.collapsed || undefined}>
    <div className="travel-session-sidebar-header">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="travel-session-collapse"
        aria-label={props.collapsed ? 'Expand session sidebar' : 'Collapse session sidebar'}
        aria-expanded={!props.collapsed}
        onClick={() => props.onCollapsedChange(!props.collapsed)}
      >
        {props.collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
      </Button>
      <Button type="button" className="travel-session-new" onClick={props.onNew} disabled={props.switching} aria-label="Start new chat">
        <Plus aria-hidden="true" />
        <span>New chat</span>
      </Button>
    </div>
    <nav className="travel-session-list" aria-label="Previous chats">
      {orderedSessions(props.sessions).map(session => <Button
        key={session.id}
        type="button"
        variant="ghost"
        className="travel-session-item"
        data-active={session.id === props.activeSessionId || undefined}
        aria-current={session.id === props.activeSessionId ? 'page' : undefined}
        aria-label={props.collapsed ? session.title : undefined}
        disabled={props.switching}
        onClick={() => props.onSelect(session.id)}
      >
        <span className="travel-session-mark" aria-hidden="true">{session.title.slice(0, 1).toLocaleUpperCase()}</span>
        <span className="travel-session-title">{session.title}</span>
      </Button>)}
    </nav>
  </aside>
}
