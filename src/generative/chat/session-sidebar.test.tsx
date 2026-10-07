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
  const onCollapsedChange = vi.fn()
  render(<SessionSidebar sessions={[session]} activeSessionId={session.id} collapsed onNew={onNew} onSelect={onSelect} onCollapsedChange={onCollapsedChange} />)
  expect(screen.getByRole('complementary', { name: 'Chat sessions' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Start new chat' }))
  await user.click(screen.getByRole('button', { name: 'Prague to Rome' }))
  await user.click(screen.getByRole('button', { name: 'Expand session sidebar' }))
  expect(onNew).toHaveBeenCalledOnce()
  expect(onSelect).toHaveBeenCalledWith(session.id)
  expect(onCollapsedChange).toHaveBeenCalledWith(false)
  expect(screen.getByRole('button', { name: 'Prague to Rome' })).toHaveAttribute('aria-current', 'page')
})
