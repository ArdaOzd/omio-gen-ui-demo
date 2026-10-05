import { fireEvent, render, screen } from '@testing-library/react'
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

it('switches the landing search to a planner prompt and submits it once', () => {
  const onPlan = vi.fn()
  render(<SearchForm search={search} locations={[search.origin, search.destination]} dateBounds={{ min: '2026-01-01', max: '2027-12-31' }} onChange={vi.fn()} onSubmit={vi.fn()} onPlan={onPlan} />)
  fireEvent.click(screen.getByRole('tab', { name: 'Smart planner' }))
  const prompt = '  Five days by train from Prague to Rome  '
  fireEvent.change(screen.getByRole('textbox', { name: 'Describe your trip' }), { target: { value: prompt } })
  fireEvent.submit(screen.getByRole('button', { name: 'Plan my trip' }).closest('form')!)
  fireEvent.submit(screen.getByRole('button', { name: 'Plan my trip' }).closest('form')!)
  expect(onPlan).toHaveBeenCalledOnce()
  expect(onPlan).toHaveBeenCalledWith(prompt)
})

it('stores and reads the exact prompt for the matching handoff', () => {
  const prompt = '  Keep my spacing exactly.\nSecond line.  '
  const handoff = storeSmartPlannerHandoff(prompt)
  expect(readSmartPlannerHandoff(handoff.id)).toEqual({ ...handoff, prompt })
  expect(readSmartPlannerHandoff('another-id')).toBeNull()
})
