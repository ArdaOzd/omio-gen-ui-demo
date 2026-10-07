import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('./components/Icons.jsx', () => ({ default: () => null }))
import SearchForm from './components/SearchForm.jsx'
import { readSmartPlannerHandoff, storeSmartPlannerHandoff } from './generative/smart-planner-handoff'

const search = {
  origin: { id: 'prague', display_name: 'Prague' },
  destination: { id: 'rome', display_name: 'Rome' },
  departureDate: '2026-10-05',
  returnDate: '',
  passengers: 1,
}

beforeEach(() => sessionStorage.clear())

it('switches the landing search to a planner prompt and submits it once', async () => {
  const user = userEvent.setup()
  const onPlan = vi.fn()
  render(<SearchForm search={search} locations={[search.origin, search.destination]} dateBounds={{ min: '2026-01-01', max: '2027-12-31' }} onChange={vi.fn()} onSubmit={vi.fn()} onPlan={onPlan} />)
  await user.click(screen.getByRole('tab', { name: 'Smart planner' }))
  const prompt = '  Five days by train from Prague to Rome  '
  fireEvent.change(screen.getByRole('textbox', { name: 'Describe your trip' }), { target: { value: prompt } })
  fireEvent.submit(screen.getByRole('button', { name: 'Plan my trip' }).closest('form')!)
  fireEvent.submit(screen.getByRole('button', { name: 'Plan my trip' }).closest('form')!)
  expect(onPlan).toHaveBeenCalledOnce()
  expect(onPlan).toHaveBeenCalledWith(prompt)
})

it('keeps Enter multiline and sends the exact nonblank prompt with Shift+Enter', async () => {
  const user = userEvent.setup()
  const onPlan = vi.fn()
  render(<SearchForm search={search} locations={[search.origin, search.destination]} dateBounds={{ min: '2026-01-01', max: '2027-12-31' }} onChange={vi.fn()} onSubmit={vi.fn()} onPlan={onPlan} />)
  await user.click(screen.getByRole('tab', { name: 'Smart planner' }))
  const textbox = screen.getByRole('textbox', { name: 'Describe your trip' })
  await user.type(textbox, '  First line{Enter}Second line  ')
  expect(textbox).toHaveValue('  First line\nSecond line  ')
  fireEvent.keyDown(textbox, { key: 'Enter', shiftKey: true })
  expect(onPlan).toHaveBeenCalledOnce()
  expect(onPlan).toHaveBeenCalledWith('  First line\nSecond line  ')
})

it('does not send a blank prompt with Shift+Enter', async () => {
  const user = userEvent.setup()
  const onPlan = vi.fn()
  render(<SearchForm search={search} locations={[search.origin, search.destination]} dateBounds={{ min: '2026-01-01', max: '2027-12-31' }} onChange={vi.fn()} onSubmit={vi.fn()} onPlan={onPlan} />)
  await user.click(screen.getByRole('tab', { name: 'Smart planner' }))
  const textbox = screen.getByRole('textbox', { name: 'Describe your trip' })
  await user.type(textbox, '   ')
  fireEvent.keyDown(textbox, { key: 'Enter', shiftKey: true })
  expect(onPlan).not.toHaveBeenCalled()
  expect(screen.getByText('Tell the planner what kind of trip you want.')).toBeVisible()
})

it('opens a new empty chat without submitting the textarea prompt', async () => {
  const user = userEvent.setup()
  const onPlan = vi.fn()
  render(<SearchForm search={search} locations={[search.origin, search.destination]} dateBounds={{ min: '2026-01-01', max: '2027-12-31' }} onChange={vi.fn()} onSubmit={vi.fn()} onPlan={onPlan} />)
  await user.click(screen.getByRole('tab', { name: 'Smart planner' }))
  await user.type(screen.getByRole('textbox', { name: 'Describe your trip' }), 'Do not send this')
  await user.click(screen.getByRole('button', { name: 'Go to chat' }))
  expect(onPlan).toHaveBeenCalledOnce()
  expect(onPlan).toHaveBeenCalledWith()
})

it('stores and reads the exact prompt for the matching handoff', () => {
  const prompt = '  Keep my spacing exactly.\nSecond line.  '
  const handoff = storeSmartPlannerHandoff(prompt)
  expect(readSmartPlannerHandoff(handoff.id)).toEqual({ ...handoff, prompt })
  expect(readSmartPlannerHandoff('another-id')).toBeNull()
})
