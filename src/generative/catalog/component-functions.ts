import type { ComponentFunction } from '../contracts/query-groups'
import { catalogDescriptors } from './generated/catalog'

export type CatalogComponentName = (typeof catalogDescriptors)[number]['name']

export type ComponentFunctionDeclaration = {
  purpose: string
  function: ComponentFunction
}

const none: readonly ComponentFunctionDeclaration[] = []
const ordered = (purpose: string): readonly ComponentFunctionDeclaration[] => [{ purpose, function: { kind: 'orderedFares' } }]
const selected = (purpose: string): readonly ComponentFunctionDeclaration[] => [{ purpose, function: { kind: 'selectedFacts' } }]

export const componentFunctions = {
  MultiCityPlanGrid: none,
  FareCalendar: [
    { purpose: 'calendar-days', function: { kind: 'calendarDays' } },
    { purpose: 'active-day-fares', function: { kind: 'dayFares' } },
  ],
  FadeFares: ordered('leg-fare-strip'),
  FareOrder: none,
  TransportSelect: [{ purpose: 'available-modes', function: { kind: 'modeStats', baseline: 'withoutModeFilter' } }],
  StayDuration: none,
  TravelDate: none,
  CityField: [{ purpose: 'location-options', function: { kind: 'locationOptions' } }],
  TravelHero: none,
  Carousel: none,
  DateWindow: none,
  FarePicker: ordered('fare-picker'),
  CheapestFastest: [{ purpose: 'fare-highlights', function: { kind: 'fareHighlights' } }],
  TravelSurface: none,
  Section: none,
  Stack: none,
  Inline: none,
  ResponsiveGrid: none,
  SplitPane: none,
  StickySummary: none,
  Tabs: none,
  Callout: none,
  DateStrip: none,
  ModeChips: [{ purpose: 'available-modes', function: { kind: 'modeStats', baseline: 'withoutModeFilter' } }],
  CarrierFilter: [{ purpose: 'carrier-facets', function: { kind: 'carrierFacets' } }],
  PriceRange: none,
  DurationRange: none,
  DirectToggle: none,
  SortSelect: none,
  StayAllocation: none,
  FareCards: ordered('fare-cards'),
  ComparisonTable: ordered('comparison-table'),
  ComparisonMatrix: [{ purpose: 'comparison-matrix', function: { kind: 'modeStats', baseline: 'active' } }],
  PriceCalendar: [{ purpose: 'price-calendar', function: { kind: 'calendarDays' } }],
  ModeBreakdown: [{ purpose: 'mode-breakdown', function: { kind: 'modeStats', baseline: 'active' } }],
  SyntheticTotal: selected('selected-total'),
  CoverageSummary: [{ purpose: 'coverage-summary', function: { kind: 'coverage' } }],
  CitySequence: none,
  RouteMap: none,
  ItineraryTimeline: ordered('itinerary-timeline'),
  DurationPricePlot: ordered('duration-price-plot'),
  SelectedItinerary: selected('selected-itinerary'),
  ArtifactSkeleton: none,
  CoverageNotice: [{ purpose: 'coverage-notice', function: { kind: 'coverage' } }],
  EmptyState: none,
  InlineError: none,
  StaleBadge: none,
  RetryAction: none,
  SelectedFareCount: selected('selected-fare-count'),
} satisfies Record<CatalogComponentName, readonly ComponentFunctionDeclaration[]>

export function functionsForComponent(name: CatalogComponentName): readonly ComponentFunctionDeclaration[] {
  return componentFunctions[name]
}
