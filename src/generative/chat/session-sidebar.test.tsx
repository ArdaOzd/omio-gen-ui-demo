import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { createSessionSummary } from './session-history'
import { SessionSidebar } from './session-sidebar'

it('keeps New chat and session buttons accessible while collapsed', async () => {
  const user = userEvent.setup()
  const session = createSessionSummary({ title: 'Prague to Rome' })
  const onNew = vi.fn()
  const onSelect = vi.fn()
  const onRename = vi.fn()
  const onCollapsedChange = vi.fn()
  render(<SessionSidebar sessions={[session]} activeSessionId={session.id} collapsed onNew={onNew} onSelect={onSelect} onRename={onRename} onCollapsedChange={onCollapsedChange} />)
  expect(screen.getByRole('complementary', { name: 'Chat sessions' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Start new chat' }))
  await user.click(screen.getByRole('button', { name: 'Prague to Rome' }))
  await user.click(screen.getByRole('button', { name: 'Expand session sidebar' }))
  expect(onNew).toHaveBeenCalledOnce()
  expect(onSelect).toHaveBeenCalledWith(session.id)
  expect(onCollapsedChange).toHaveBeenCalledWith(false)
  expect(screen.getByRole('button', { name: 'Prague to Rome' })).toHaveAttribute('aria-current', 'page')
})

it('renames a session without replacing its selection control', async () => {
  const user = userEvent.setup()
  const session = createSessionSummary({ title: 'Original audit prompt' })
  const onRename = vi.fn()
  render(<SessionSidebar
    sessions={[session]}
    activeSessionId={session.id}
    collapsed={false}
    onNew={vi.fn()}
    onSelect={vi.fn()}
    onRename={onRename}
    onCollapsedChange={vi.fn()}
  />)

  await user.click(screen.getByRole('button', { name: 'Rename chat Original audit prompt' }))
  const input = screen.getByRole('textbox', { name: 'Chat name' })
  await user.clear(input)
  await user.type(input, '#3{Enter}')

  expect(onRename).toHaveBeenCalledWith(session.id, '#3')
  expect(screen.getByRole('button', { name: 'Original audit prompt' })).toHaveAttribute('aria-current', 'page')
})
