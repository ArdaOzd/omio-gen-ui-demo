import { describe, expect, it } from 'vitest'
import { catalogDescriptors } from '../catalog/generated/catalog'
import { presentationPrompt } from './prompt'

const suggestedCompositions = [
  ['MultiCityPlanGrid', 'ResponsiveGrid', 'CheapestFastest', 'RouteMap', 'SelectedItinerary', 'SyntheticTotal'],
  ['FareCalendar', 'Tabs', 'CitySequence'],
  ['ModeChips', 'CarrierFilter', 'DateWindow', 'PriceRange', 'DurationRange', 'DirectToggle', 'SortSelect', 'FareCards', 'FadeFares'],
  ['FarePicker', 'StickySummary', 'SelectedFareCount'],
  ['ComparisonTable', 'DurationPricePlot'],
  ['PriceCalendar', 'ComparisonMatrix', 'ModeBreakdown'],
  ['ItineraryTimeline', 'Section'],
  ['Carousel'],
  ['CoverageSummary', 'CoverageNotice', 'EmptyState', 'InlineError', 'RetryAction'],
] as const

describe('Variant A composition guidance', () => {
  it('recommends only registered components across varied booking and analysis patterns', () => {
    const registered = new Set(catalogDescriptors.map((descriptor) => descriptor.name))
    const suggested = new Set(suggestedCompositions.flat())

    expect(suggested.size).toBeGreaterThanOrEqual(25)
    for (const component of suggested) {
      expect(registered, `${component} must be registered`).toContain(component)
      expect(presentationPrompt, `${component} must be visible to the agent`).toContain(component)
    }
  })

  it('keeps creative composition subordinate to complete per-leg booking ownership', () => {
    const patterns = presentationPrompt.split('\n').filter((line) => /^- (Complete booking|Analysis),/.test(line))

    expect(patterns.length).toBeGreaterThanOrEqual(4)
    expect(presentationPrompt).toContain('use one of the first two complete-booking patterns')
    expect(presentationPrompt).toContain('the remaining patterns are analysis or supplements')
    expect(presentationPrompt).toContain('one FareCalendar for every leg in route order')
    expect(presentationPrompt).toContain('booking ownership and exact leg coverage apply across the whole authored tree')
    expect(presentationPrompt).toContain("matching datasetRef and legIndex")
    expect(presentationPrompt).toContain('ingredients, not templates or a checklist')
    expect(presentationPrompt).toContain('Choose only the few views that answer the request')
    expect(presentationPrompt).toContain('do not invent components, props, custom CSS, styles or data')
    expect(presentationPrompt).toContain('StickySummary is an authored supporting container, not the fixed host PlanningTracker')
  })

  it('describes FadeFares as bounded progressive vertical browsing', () => {
    const fadeFares = catalogDescriptors.find((descriptor) => descriptor.name === 'FadeFares')

    expect(fadeFares?.description).toContain('bounded vertically scrollable')
    expect(fadeFares?.description).toContain('cursor pages near the bottom')
    expect(fadeFares?.description).toContain('resets loaded pages plus scroll position')
    expect(fadeFares?.description).toContain('exact display provenance')
    expect(fadeFares?.description).not.toMatch(/horizontally scrolling|edge fades/i)
  })
})
