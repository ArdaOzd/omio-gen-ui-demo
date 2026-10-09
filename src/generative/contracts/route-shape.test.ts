import { describe, expect, it } from 'vitest'
import { CitySequenceSchema } from '../contracts'
import { createUIStateStore } from '../state/ui-state-store'
import { ArtifactIdSchema } from '../contracts'
import { legDate } from '../state/leg-bindings'
import { scheduleLegs } from '../state/itinerary-schedule'

describe('supported route shape', () => {
  it('accepts distinct stops and a final return to the origin', () => {
    expect(CitySequenceSchema.parse(['london', 'paris', 'rome'])).toHaveLength(3)
    expect(CitySequenceSchema.parse(['london', 'paris', 'rome', 'london'])).toHaveLength(4)
  })

  it('rejects repeated intermediate visits and duplicate route legs', () => {
    expect(() => CitySequenceSchema.parse(['london', 'paris', 'london', 'paris'])).toThrow(/visit each city once/)
    expect(() => CitySequenceSchema.parse(['london', 'paris', 'paris'])).toThrow(/visit each city once/)
  })

  it('does not apply the final origin stay to the first leg of a round trip', () => {
    const store=createUIStateStore();const id=ArtifactIdSchema.parse('round-trip')
    store.initializeMissing(id,{dates:{start:'2026-10-26'},citySequence:['london','paris','rome','london'],stays:[{cityId:'paris',nights:2},{cityId:'rome',nights:3},{cityId:'london',nights:5}]})
    expect(legDate(store.get(id),'london')).toBe('2026-10-26')
    expect(legDate(store.get(id),'rome')).toBe('2026-10-31')
    expect(scheduleLegs(store.get(id),[{originIds:['london'],destinationIds:['paris']}],[])[0]?.threshold.date).toBe('2026-10-26')
  })

  it('prunes removed-leg control values when the route changes', () => {
    const store=createUIStateStore();const id=ArtifactIdSchema.parse('route-pruning')
    store.initializeMissing(id,{citySequence:['london','paris','rome'],stays:[{cityId:'paris',nights:2},{cityId:'rome',nights:3}],modesByLeg:{'london:paris':['train'],'paris:rome':['bus']},availableModesByLeg:{'london:paris':['train'],'paris:rome':['bus']},displayWindowByLeg:{'london:paris':{from:'2026-10-26',to:'2026-10-27'},'paris:rome':{from:'2026-10-28',to:'2026-10-29'}},sortByLeg:{'paris:rome':{field:'durationMinutes',direction:'asc'}},calendarDateByLeg:{'paris:rome':'2026-10-28'}})
    store.dispatch({kind:'route',artifactId:id,citySequence:['london','paris']})
    expect(store.exportSnapshot(id)).toMatchObject({citySequence:['london','paris'],stays:[{cityId:'paris',nights:2}],modesByLeg:{'london:paris':['train']},availableModesByLeg:{'london:paris':['train']},displayWindowByLeg:{'london:paris':{from:'2026-10-26',to:'2026-10-27'}},sortByLeg:{},calendarDateByLeg:{}})
  })

  it('moves per-leg display bounds with start and end range edits', () => {
    const store = createUIStateStore()
    const id = ArtifactIdSchema.parse('date-window-shift')
    store.initializeMissing(id, {
      dates: { start: '2026-10-09', end: '2026-10-11' },
      displayWindowByLeg: {
        'london:paris': { from: '2026-10-09', to: '2026-10-11' },
        'paris:rome': { from: '2026-10-10', to: '2026-10-11' },
      },
    })

    store.dispatch({ kind: 'dates', artifactId: id, dates: { start: '2026-10-10', end: '2026-10-11' } })
    expect(store.get(id).displayWindowByLeg).toEqual({
      'london:paris': { from: '2026-10-10', to: '2026-10-11' },
      'paris:rome': { from: '2026-10-11', to: '2026-10-11' },
    })

    store.dispatch({ kind: 'dates', artifactId: id, dates: { start: '2026-10-10', end: '2026-10-13' } })
    expect(store.get(id).displayWindowByLeg).toEqual({
      'london:paris': { from: '2026-10-10', to: '2026-10-13' },
      'paris:rome': { from: '2026-10-11', to: '2026-10-13' },
    })

    store.dispatch({ kind: 'calendarDates', artifactId: id, dates: { start: '2026-10-12', end: '2026-10-15' } })
    expect(store.get(id)).toMatchObject({
      dates: { start: '2026-10-12', end: '2026-10-15' },
      displayWindowByLeg: {
        'london:paris': { from: '2026-10-10', to: '2026-10-13' },
        'paris:rome': { from: '2026-10-11', to: '2026-10-13' },
      },
    })
  })
})
