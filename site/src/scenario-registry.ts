import type { ArtifactUIState } from '../../src/generative/contracts'
import type { FareScope } from '../../src/generative/contracts/query-groups'
import { validatePresentTree, type PresentNode } from '../../src/generative/presentation/tree'

export type ShowcaseScenarioKey =
  | 'price-versus-time'
  | 'manual-leg-editor'
  | 'multi-city-workspace'
  | 'date-strip-price-calendar'
  | 'mode-dashboard'
  | 'budget-shortlist'
  | 'fare-cards-controls'
  | 'story-layouts'
  | 'flexible-calendar'
  | 'weekly-fare-browser'

export type ShowcaseScenario = {
  key: ShowcaseScenarioKey
  title: string
  tree: PresentNode
  initialState: Partial<ArtifactUIState>
  scopes: readonly FareScope[]
}

const DECEMBER_SCOPE = { from: '2026-12-01', to: '2026-12-15' }
const INITIAL_DAY = '2026-12-08'
const INITIAL_WEEK = { start: INITIAL_DAY, end: '2026-12-14' }
const INITIAL_DAY_WINDOW = { from: INITIAL_DAY, to: INITIAL_DAY }
const INITIAL_WEEK_WINDOW = { from: INITIAL_WEEK.start, to: INITIAL_WEEK.end }

function scope(originId: string, destinationId: string): FareScope {
  return {
    kind: 'fareScope',
    originId,
    destinationId,
    dateWindow: DECEMBER_SCOPE,
    passengers: 1,
    earliestDeparture: { date: DECEMBER_SCOPE.from, minutes: 0 },
  }
}

function state(input: Partial<ArtifactUIState>): Partial<ArtifactUIState> {
  return {
    filters: { modes: [], carrierIds: [], directOnly: false },
    sort: { field: 'priceCents', direction: 'asc' },
    selectedFareIds: [],
    pending: [],
    ...input,
  }
}

function tree(input: unknown): PresentNode {
  return validatePresentTree(input)
}

const londonParisScope = scope('london', 'paris')
const berlinAmsterdamScope = scope('berlin', 'amsterdam')
const parisBarcelonaScope = scope('paris', 'barcelona')

const priceVersusTimeArtifact = 'showcase-price-versus-time'
const priceVersusTimeDataset = 'seed-price-versus-time-leg-0'
const priceVersusTime: ShowcaseScenario = {
  key: 'price-versus-time',
  title: 'Price versus time dashboard',
  scopes: [londonParisScope],
  initialState: state({
    citySequence: ['london', 'paris'],
    dates: { start: INITIAL_DAY },
    displayWindowByLeg: { 'london:paris': INITIAL_DAY_WINDOW },
  }),
  tree: tree({
    artifactRef: priceVersusTimeArtifact,
    title: 'London → Paris · 8 December 2026',
    $type: 'TravelSurface',
    $key: 'london-paris-tradeoff',
    children: [
      { artifactRef: priceVersusTimeArtifact, datasetRef: priceVersusTimeDataset, title: 'Save money or save time', variant: 'emphasis', legIndex: 0, $type: 'CheapestFastest', $key: 'leg-0-cheapest-fastest' },
      {
        artifactRef: priceVersusTimeArtifact,
        $type: 'ResponsiveGrid',
        $key: 'exact-options-and-tradeoff',
        children: [
          { artifactRef: priceVersusTimeArtifact, datasetRef: priceVersusTimeDataset, title: 'Exact fare options', legIndex: 0, $type: 'ComparisonTable', $key: 'leg-0-exact-options' },
          { artifactRef: priceVersusTimeArtifact, datasetRef: priceVersusTimeDataset, title: 'Price versus journey time', legIndex: 0, $type: 'DurationPricePlot', $key: 'leg-0-price-duration' },
        ],
      },
    ],
  }),
}

const manualLegArtifact = 'showcase-manual-leg-editor'
const manualLegFirstDataset = 'seed-manual-leg-editor-leg-0'
const manualLegSecondDataset = 'seed-manual-leg-editor-leg-1'
const manualLegEditor: ShowcaseScenario = {
  key: 'manual-leg-editor',
  title: 'Direct leg editing controls',
  scopes: [londonParisScope, parisBarcelonaScope],
  initialState: state({
    citySequence: ['london', 'paris', 'barcelona'],
    dates: { start: INITIAL_DAY, end: DECEMBER_SCOPE.to },
    stays: [{ cityId: 'paris', nights: 2 }, { cityId: 'barcelona', nights: 4 }],
    displayWindowByLeg: {
      'london:paris': { from: INITIAL_DAY, to: DECEMBER_SCOPE.to },
      'paris:barcelona': { from: '2026-12-10', to: DECEMBER_SCOPE.to },
    },
  }),
  tree: tree({
    artifactRef: manualLegArtifact,
    title: 'London → Paris → Barcelona',
    $type: 'TravelSurface',
    $key: 'manual-trip-editor',
    children: [
      {
        artifactRef: manualLegArtifact,
        title: 'Edit London → Paris before choosing a fare',
        $type: 'Section',
        $key: 'first-leg-manual',
        children: [
          { artifactRef: manualLegArtifact, datasetRef: manualLegFirstDataset, title: 'Origin and destination', legIndex: 0, $type: 'CityField', $key: 'first-leg-cities' },
          {
            artifactRef: manualLegArtifact,
            $type: 'Inline',
            $key: 'first-leg-controls',
            children: [
              { artifactRef: manualLegArtifact, datasetRef: manualLegFirstDataset, title: 'Departure date', legIndex: 0, $type: 'TravelDate', $key: 'first-leg-date' },
              { artifactRef: manualLegArtifact, datasetRef: manualLegFirstDataset, legIndex: 0, $type: 'TransportSelect', $key: 'first-leg-transport' },
              { artifactRef: manualLegArtifact, datasetRef: manualLegFirstDataset, title: 'Stay in Paris', legIndex: 0, $type: 'StayDuration', $key: 'paris-stay' },
              { artifactRef: manualLegArtifact, datasetRef: manualLegFirstDataset, legIndex: 0, $type: 'FareOrder', $key: 'first-leg-order' },
            ],
          },
          { artifactRef: manualLegArtifact, datasetRef: manualLegFirstDataset, title: 'Browse fares', legIndex: 0, $type: 'FadeFares', $key: 'first-leg-scrollable-fares' },
        ],
      },
      {
        artifactRef: manualLegArtifact,
        $type: 'ResponsiveGrid',
        $key: 'leg-tradeoffs',
        children: [
          { artifactRef: manualLegArtifact, datasetRef: manualLegFirstDataset, title: 'London → Paris: cheapest vs fastest', legIndex: 0, $type: 'CheapestFastest', $key: 'london-paris-comparison' },
          { artifactRef: manualLegArtifact, datasetRef: manualLegSecondDataset, title: 'Paris → Barcelona: cheapest vs fastest', legIndex: 1, $type: 'CheapestFastest', $key: 'paris-barcelona-comparison' },
        ],
      },
      { artifactRef: manualLegArtifact, title: 'Combined planner · both legs', $type: 'MultiCityPlanGrid', $key: 'complete-trip-planner' },
      {
        artifactRef: manualLegArtifact,
        $type: 'StickySummary',
        $key: 'trip-summary',
        children: [
          { artifactRef: manualLegArtifact, $type: 'SelectedItinerary', $key: 'selected-trip' },
          { artifactRef: manualLegArtifact, $type: 'SyntheticTotal', $key: 'synthetic-trip-total' },
        ],
      },
    ],
  }),
}

const multiCityArtifact = 'showcase-multi-city-workspace'
const multiCityFirstDataset = 'seed-multi-city-workspace-leg-0'
const multiCitySecondDataset = 'seed-multi-city-workspace-leg-1'
const multiCityWorkspace: ShowcaseScenario = {
  key: 'multi-city-workspace',
  title: 'Editable multi-city workspace',
  scopes: [londonParisScope, parisBarcelonaScope],
  initialState: state({
    citySequence: ['london', 'paris', 'barcelona'],
    dates: { start: INITIAL_DAY, end: DECEMBER_SCOPE.to },
    stays: [{ cityId: 'paris', nights: 2 }, { cityId: 'barcelona', nights: 4 }],
    displayWindowByLeg: {
      'london:paris': { from: INITIAL_DAY, to: DECEMBER_SCOPE.to },
      'paris:barcelona': { from: '2026-12-10', to: DECEMBER_SCOPE.to },
    },
  }),
  tree: tree({
    artifactRef: multiCityArtifact,
    $type: 'TravelSurface',
    $key: 'trip-workspace',
    children: [
      {
        artifactRef: multiCityArtifact,
        title: 'London → Paris → Barcelona',
        $type: 'TravelHero',
        $key: 'route-headline',
        children: [
          { artifactRef: multiCityArtifact, $type: 'CitySequence', $key: 'ordered-stops' },
          { artifactRef: multiCityArtifact, $type: 'StayAllocation', $key: 'stay-allocation' },
        ],
      },
      { artifactRef: multiCityArtifact, title: 'Edit your trip', $type: 'MultiCityPlanGrid', $key: 'editable-all-legs' },
      {
        artifactRef: multiCityArtifact,
        $type: 'ResponsiveGrid',
        $key: 'leg-comparisons',
        children: [
          { artifactRef: multiCityArtifact, datasetRef: multiCityFirstDataset, title: 'London → Paris: cheapest versus fastest', legIndex: 0, $type: 'CheapestFastest', $key: 'london-paris-comparison' },
          { artifactRef: multiCityArtifact, datasetRef: multiCitySecondDataset, title: 'Paris → Barcelona: cheapest versus fastest', legIndex: 1, $type: 'CheapestFastest', $key: 'paris-barcelona-comparison' },
        ],
      },
      {
        artifactRef: multiCityArtifact,
        $type: 'Inline',
        $key: 'trip-status',
        children: [
          { artifactRef: multiCityArtifact, $type: 'SelectedFareCount', $key: 'selected-fare-count' },
          { artifactRef: multiCityArtifact, $type: 'CoverageSummary', $key: 'coverage-details' },
        ],
      },
    ],
  }),
}

const dateStripArtifact = 'showcase-date-strip-price-calendar'
const dateStripDataset = 'seed-date-strip-price-calendar-leg-0'
const dateStripPriceCalendar: ShowcaseScenario = {
  key: 'date-strip-price-calendar',
  title: 'Date strip and price-by-day calendar',
  scopes: [berlinAmsterdamScope],
  initialState: state({
    citySequence: ['berlin', 'amsterdam'],
    dates: INITIAL_WEEK,
    displayWindowByLeg: { 'berlin:amsterdam': INITIAL_WEEK_WINDOW },
    calendarDateByLeg: { 'berlin:amsterdam': INITIAL_DAY },
  }),
  tree: tree({
    artifactRef: dateStripArtifact,
    title: 'Berlin → Amsterdam · 8–14 December 2026',
    $type: 'TravelSurface',
    $key: 'berlin-amsterdam-tracker',
    children: [
      { artifactRef: dateStripArtifact, datasetRef: dateStripDataset, title: 'Browse departure dates', $type: 'DateStrip', $key: 'departure-date-strip' },
      { artifactRef: dateStripArtifact, datasetRef: dateStripDataset, title: 'Prices by day', legIndex: 0, $type: 'PriceCalendar', $key: 'price-by-day-calendar' },
      { artifactRef: dateStripArtifact, datasetRef: dateStripDataset, title: 'Cheapest versus fastest', legIndex: 0, $type: 'CheapestFastest', $key: 'cheapest-versus-fastest-leg-0' },
    ],
  }),
}

const modeDashboardArtifact = 'showcase-mode-dashboard'
const modeDashboardDataset = 'seed-mode-dashboard-leg-0'
const modeDashboard: ShowcaseScenario = {
  key: 'mode-dashboard',
  title: 'Transport mode comparison',
  scopes: [londonParisScope],
  initialState: state({
    citySequence: ['london', 'paris'],
    dates: { start: INITIAL_DAY },
    displayWindowByLeg: { 'london:paris': INITIAL_DAY_WINDOW },
  }),
  tree: tree({
    artifactRef: modeDashboardArtifact,
    $type: 'TravelSurface',
    $key: 'london-paris-dashboard',
    children: [
      { artifactRef: modeDashboardArtifact, title: 'London → Paris · 8 December 2026', body: 'Compare fares by transport mode, then weigh price against journey time.', $type: 'TravelHero', $key: 'dashboard-heading' },
      {
        artifactRef: modeDashboardArtifact,
        $type: 'ResponsiveGrid',
        $key: 'mode-dashboard',
        children: [
          { artifactRef: modeDashboardArtifact, datasetRef: modeDashboardDataset, title: 'Options by mode', legIndex: 0, $type: 'ModeBreakdown', $key: 'mode-option-counts' },
          { artifactRef: modeDashboardArtifact, datasetRef: modeDashboardDataset, title: 'Cheapest fare and fastest journey by mode', legIndex: 0, $type: 'ComparisonMatrix', $key: 'mode-price-time-comparison' },
        ],
      },
      { artifactRef: modeDashboardArtifact, datasetRef: modeDashboardDataset, title: 'Overall savings versus speed', legIndex: 0, $type: 'CheapestFastest', $key: 'leg-0-cheapest-fastest' },
      { artifactRef: modeDashboardArtifact, datasetRef: modeDashboardDataset, title: 'Compare and choose a fare', variant: 'compact', legIndex: 0, $type: 'ComparisonTable', $key: 'short-fare-comparison' },
    ],
  }),
}

const budgetArtifact = 'showcase-budget-shortlist'
const budgetDataset = 'seed-budget-shortlist-leg-0'
const budgetShortlist: ShowcaseScenario = {
  key: 'budget-shortlist',
  title: 'Direct budget shortlist',
  scopes: [londonParisScope],
  initialState: state({
    citySequence: ['london', 'paris'],
    dates: INITIAL_WEEK,
    displayWindowByLeg: { 'london:paris': INITIAL_WEEK_WINDOW },
    filters: { modes: [], carrierIds: [], maxPriceCents: 8000, directOnly: true },
  }),
  tree: tree({
    artifactRef: budgetArtifact,
    title: 'London → Paris · fare shortlist',
    $type: 'TravelSurface',
    $key: 'london-paris-shortlist',
    children: [
      {
        artifactRef: budgetArtifact,
        title: 'Refine your shortlist',
        variant: 'compact',
        $type: 'Section',
        $key: 'shortlist-filters',
        children: [
          {
            artifactRef: budgetArtifact,
            $type: 'Inline',
            $key: 'filter-controls',
            children: [
              { artifactRef: budgetArtifact, $type: 'DateWindow', $key: 'travel-window' },
              { artifactRef: budgetArtifact, datasetRef: budgetDataset, legIndex: 0, $type: 'ModeChips', $key: 'leg-0-modes' },
              { artifactRef: budgetArtifact, datasetRef: budgetDataset, legIndex: 0, $type: 'CarrierFilter', $key: 'leg-0-carriers' },
              { artifactRef: budgetArtifact, $type: 'PriceRange', $key: 'price-limit' },
              { artifactRef: budgetArtifact, $type: 'DirectToggle', $key: 'direct-only' },
            ],
          },
          { artifactRef: budgetArtifact, datasetRef: budgetDataset, title: 'Direct options up to €80', variant: 'compact', legIndex: 0, $type: 'ComparisonTable', $key: 'leg-0-shortlist' },
        ],
      },
      { artifactRef: budgetArtifact, datasetRef: budgetDataset, title: 'Compare savings with journey time', variant: 'compact', legIndex: 0, $type: 'CheapestFastest', $key: 'leg-0-cheapest-fastest' },
      { artifactRef: budgetArtifact, variant: 'compact', $type: 'SelectedFareCount', $key: 'shortlist-selected-count' },
    ],
  }),
}

const fareCardsArtifact = 'showcase-fare-cards-controls'
const fareCardsDataset = 'seed-fare-cards-controls-leg-0'
const fareCardsControls: ShowcaseScenario = {
  key: 'fare-cards-controls',
  title: 'Expanded fare cards with local controls',
  scopes: [berlinAmsterdamScope],
  initialState: state({
    citySequence: ['berlin', 'amsterdam'],
    dates: { start: INITIAL_DAY },
    displayWindowByLeg: { 'berlin:amsterdam': INITIAL_DAY_WINDOW },
  }),
  tree: tree({
    artifactRef: fareCardsArtifact,
    title: 'Berlin → Amsterdam · 8 December 2026',
    $type: 'TravelSurface',
    $key: 'berlin-amsterdam-surface',
    children: [
      {
        artifactRef: fareCardsArtifact,
        $type: 'Stack',
        $key: 'fare-discovery',
        children: [
          {
            artifactRef: fareCardsArtifact,
            $type: 'Inline',
            $key: 'fare-controls',
            children: [
              { artifactRef: fareCardsArtifact, datasetRef: fareCardsDataset, title: 'Departure day', legIndex: 0, $type: 'TravelDate', $key: 'departure-day-0' },
              { artifactRef: fareCardsArtifact, datasetRef: fareCardsDataset, title: 'Transport', legIndex: 0, $type: 'ModeChips', $key: 'mode-filter-0' },
              { artifactRef: fareCardsArtifact, datasetRef: fareCardsDataset, title: 'Operator', legIndex: 0, $type: 'CarrierFilter', $key: 'carrier-filter-0' },
            ],
          },
          { artifactRef: fareCardsArtifact, datasetRef: fareCardsDataset, title: 'Expanded fare list', legIndex: 0, $type: 'FareCards', $key: 'expanded-fares-0' },
          { artifactRef: fareCardsArtifact, datasetRef: fareCardsDataset, title: 'Lowest price or shortest journey?', legIndex: 0, $type: 'CheapestFastest', $key: 'cheapest-fastest-0' },
        ],
      },
    ],
  }),
}

const storyArtifact = 'showcase-story-layouts'
const storyDataset = 'seed-story-layouts-leg-0'
const storyLayouts: ShowcaseScenario = {
  key: 'story-layouts',
  title: 'Tabbed journey story',
  scopes: [londonParisScope],
  initialState: state({
    citySequence: ['london', 'paris'],
    dates: { start: INITIAL_DAY },
    displayWindowByLeg: { 'london:paris': INITIAL_DAY_WINDOW },
  }),
  tree: tree({
    artifactRef: storyArtifact,
    $type: 'TravelSurface',
    $key: 'journey-story',
    children: [
      { artifactRef: storyArtifact, title: 'London to Paris', body: '8 December 2026 · Compare your journey, then collect your preferred option.', $type: 'TravelHero', $key: 'story-hero' },
      {
        artifactRef: storyArtifact,
        $type: 'SplitPane',
        $key: 'decision-and-summary',
        children: [
          {
            artifactRef: storyArtifact,
            $type: 'Tabs',
            $key: 'comparison-tabs',
            children: [
              {
                artifactRef: storyArtifact,
                title: 'Journey highlights',
                $type: 'Section',
                $key: 'highlights-tab',
                children: [
                  {
                    artifactRef: storyArtifact,
                    $type: 'Carousel',
                    $key: 'option-panels',
                    children: [
                      { artifactRef: storyArtifact, datasetRef: storyDataset, title: 'Save money or save time', variant: 'compact', legIndex: 0, $type: 'CheapestFastest', $key: 'leg-0-cheapest-fastest' },
                      { artifactRef: storyArtifact, datasetRef: storyDataset, title: 'Compare transport modes', variant: 'compact', legIndex: 0, $type: 'ComparisonMatrix', $key: 'leg-0-mode-comparison' },
                    ],
                  },
                ],
              },
              {
                artifactRef: storyArtifact,
                title: 'Option details',
                $type: 'Section',
                $key: 'details-tab',
                children: [
                  { artifactRef: storyArtifact, datasetRef: storyDataset, title: 'Compare individual journeys', variant: 'compact', legIndex: 0, $type: 'ComparisonTable', $key: 'leg-0-option-table' },
                ],
              },
            ],
          },
          {
            artifactRef: storyArtifact,
            title: 'Your chosen journey',
            $type: 'StickySummary',
            $key: 'persistent-summary',
            children: [
              { artifactRef: storyArtifact, variant: 'compact', $type: 'SelectedItinerary', $key: 'selected-journey' },
              { artifactRef: storyArtifact, $type: 'SyntheticTotal', $key: 'selected-synthetic-total' },
            ],
          },
        ],
      },
      { artifactRef: storyArtifact, title: 'Demo prices, not live offers', body: 'Selecting an option does not reserve, book or purchase travel.', $type: 'Callout', $key: 'synthetic-price-note' },
    ],
  }),
}

const flexibleArtifact = 'showcase-flexible-calendar'
const flexibleDataset = 'seed-flexible-calendar-leg-0'
const flexibleCalendar: ShowcaseScenario = {
  key: 'flexible-calendar',
  title: 'Flexible-date booking calendar',
  scopes: [londonParisScope],
  initialState: state({
    citySequence: ['london', 'paris'],
    dates: INITIAL_WEEK,
    displayWindowByLeg: { 'london:paris': INITIAL_WEEK_WINDOW },
    calendarDateByLeg: { 'london:paris': INITIAL_DAY },
  }),
  tree: tree({
    artifactRef: flexibleArtifact,
    title: 'London–Paris · 8–14 December 2026',
    $type: 'TravelSurface',
    $key: 'london-paris-flex-workspace',
    children: [
      {
        artifactRef: flexibleArtifact,
        $type: 'SplitPane',
        $key: 'calendar-and-comparison',
        children: [
          { artifactRef: flexibleArtifact, datasetRef: flexibleDataset, title: 'Cheapest fare for each date', legIndex: 0, $type: 'FareCalendar', $key: 'london-paris-calendar-0' },
          {
            artifactRef: flexibleArtifact,
            $type: 'StickySummary',
            $key: 'persistent-comparison',
            children: [
              { artifactRef: flexibleArtifact, datasetRef: flexibleDataset, title: 'Cheapest versus fastest', legIndex: 0, $type: 'CheapestFastest', $key: 'london-paris-cheapest-fastest-0' },
            ],
          },
        ],
      },
    ],
  }),
}

const weeklyArtifact = 'showcase-weekly-fare-browser'
const weeklyDataset = 'seed-weekly-fare-browser-leg-0'
const weeklyFareBrowser: ShowcaseScenario = {
  key: 'weekly-fare-browser',
  title: 'Flexible week fare browser',
  scopes: [londonParisScope],
  initialState: state({
    citySequence: ['london', 'paris'],
    dates: { start: INITIAL_DAY },
    displayWindowByLeg: { 'london:paris': INITIAL_WEEK_WINDOW },
    calendarDateByLeg: { 'london:paris': INITIAL_DAY },
  }),
  tree: tree({
    artifactRef: weeklyArtifact,
    $type: 'TravelSurface',
    $key: 'departure-explorer',
    children: [
      { artifactRef: weeklyArtifact, title: '{{tripRoute}}', body: 'Compare daily low fares, then explore one exact departure date.', $type: 'TravelHero', $key: 'explorer-heading' },
      {
        artifactRef: weeklyArtifact,
        title: 'Find a good departure day',
        $type: 'Section',
        $key: 'weekly-overview',
        children: [
          { artifactRef: weeklyArtifact, datasetRef: weeklyDataset, title: 'Lowest fare each day', legIndex: 0, $type: 'PriceCalendar', $key: 'weekly-lowest-prices' },
        ],
      },
      {
        artifactRef: weeklyArtifact,
        title: 'Explore your chosen departure date',
        $type: 'Section',
        $key: 'chosen-day',
        children: [
          {
            artifactRef: weeklyArtifact,
            $type: 'Inline',
            $key: 'chosen-day-controls',
            children: [
              { artifactRef: weeklyArtifact, datasetRef: weeklyDataset, title: 'Departure date', legIndex: 0, $type: 'TravelDate', $key: 'exact-departure-date' },
              { artifactRef: weeklyArtifact, datasetRef: weeklyDataset, title: 'Company', legIndex: 0, $type: 'CarrierFilter', $key: 'chosen-company' },
              { artifactRef: weeklyArtifact, datasetRef: weeklyDataset, title: 'Sort journeys', legIndex: 0, $type: 'FareOrder', $key: 'chosen-day-order' },
            ],
          },
          { artifactRef: weeklyArtifact, datasetRef: weeklyDataset, title: 'Cheapest versus fastest', legIndex: 0, $type: 'CheapestFastest', $key: 'chosen-day-cheapest-fastest' },
          { artifactRef: weeklyArtifact, datasetRef: weeklyDataset, title: 'Journey details · add to your trip', legIndex: 0, $type: 'FareCards', $key: 'chosen-day-full-details' },
        ],
      },
    ],
  }),
}

export const showcaseScenarios: readonly ShowcaseScenario[] = Object.freeze([
  priceVersusTime,
  manualLegEditor,
  multiCityWorkspace,
  dateStripPriceCalendar,
  modeDashboard,
  budgetShortlist,
  fareCardsControls,
  storyLayouts,
  flexibleCalendar,
  weeklyFareBrowser,
])
