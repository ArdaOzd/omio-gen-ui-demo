import type { ArtifactUIState } from '../contracts'
import type { PresentNode } from '../presentation/tree'

export const routeTextTokens = [
  '{{tripRoute}}',
  '{{tripOrigin}}',
  '{{tripDestination}}',
  '{{legNumber}}',
  '{{legRoute}}',
  '{{legFrom}}',
  '{{legTo}}',
  '{{startDateLong}}',
  '{{staySummary}}',
] as const

type RouteTextState = Pick<ArtifactUIState, 'citySequence' | 'dates' | 'stays'>

const arrowRoutePattern = /^\s*[^→\n]+(?:\s*→\s*[^→\n]+)+\s*$/
const numberedLegPattern = /^\s*(\d+)\s*·\s*[^→\n]+\s*→\s*[^→\n]+\s*$/
const legacyTripSummaryPattern = /^Start [^,\n]+, with [^.\n]+\.( All timetables and fares are synthetic demo data\.)$/

const cityLabel = (id: string): string => id.replace(/[-_]/g, ' ').replace(/\b\w/g, character => character.toUpperCase())

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

function staySummary(state: RouteTextState): string {
  const stays = state.citySequence
    .map(cityId => state.stays.find(stay => stay.cityId === cityId))
    .filter((stay): stay is ArtifactUIState['stays'][number] => !!stay && stay.nights > 0)
    .map(stay => `${stay.nights} night${stay.nights === 1 ? '' : 's'} in ${cityLabel(stay.cityId)}`)
  return stays.length ? list(stays) : 'no overnight stays'
}

function longDate(value: string): string {
  return new Date(`${value}T12:00:00.000Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function routeTextHasUnknownToken(value: string): boolean {
  const remainder = routeTextTokens.reduce((text, token) => text.replaceAll(token, ''), value)
  return remainder.includes('{{') || remainder.includes('}}')
}

export function routeTextNeedsLeg(value: string): boolean {
  return ['{{legNumber}}', '{{legRoute}}', '{{legFrom}}', '{{legTo}}'].some(token => value.includes(token))
}

export function resolveRouteText(value: string, state: RouteTextState, legIndex?: number): string {
  if (!value.includes('{{')) return value
  const cities = state.citySequence.map(cityLabel)
  const from = legIndex === undefined ? undefined : cities[legIndex]
  const to = legIndex === undefined ? undefined : cities[legIndex + 1]
  const legReady = from !== undefined && to !== undefined
  const replacements: Record<(typeof routeTextTokens)[number], string> = {
    '{{tripRoute}}': cities.length > 1 ? cities.join(' → ') : 'Route not set',
    '{{tripOrigin}}': cities[0] ?? 'Origin not set',
    '{{tripDestination}}': cities.at(-1) ?? 'Destination not set',
    '{{legNumber}}': legIndex === undefined ? 'Leg' : String(legIndex + 1),
    '{{legRoute}}': legReady ? `${from} → ${to}` : 'Route unavailable',
    '{{legFrom}}': from ?? 'Origin unavailable',
    '{{legTo}}': to ?? 'Destination unavailable',
    '{{startDateLong}}': longDate(state.dates.start),
    '{{staySummary}}': staySummary(state),
  }
  return routeTextTokens.reduce((text, token) => text.replaceAll(token, replacements[token]), value)
}

function normalizedText(value: string | undefined, kind: string, uniqueLegIndex: number | undefined): { value?: string; legIndex?: number } {
  if (!value) return {}
  if (kind === 'TravelHero' && arrowRoutePattern.test(value)) return { value: '{{tripRoute}}' }
  const match = numberedLegPattern.exec(value)
  if (match && uniqueLegIndex !== undefined && Number(match[1]) === uniqueLegIndex + 1) {
    return { value: '{{legNumber}} · {{legRoute}}', legIndex: uniqueLegIndex }
  }
  return { value }
}

type NormalizedNode = { node: PresentNode; legIndexes: Set<number> }

function normalizeNode(input: PresentNode): NormalizedNode {
  const authoredChildren = input.children
  const childNodes = Array.isArray(authoredChildren)
    ? authoredChildren
    : authoredChildren && typeof authoredChildren !== 'string'
      ? [authoredChildren]
      : []
  const normalizedChildren = childNodes.map(normalizeNode)
  const legIndexes = new Set<number>(input.legIndex === undefined ? [] : [input.legIndex])
  for (const child of normalizedChildren) if (child.node.artifactRef === input.artifactRef) for (const index of child.legIndexes) legIndexes.add(index)
  const uniqueLegIndex = legIndexes.size === 1 ? [...legIndexes][0] : undefined
  const title = normalizedText(input.title, input.$type, uniqueLegIndex)
  const tabLabel = normalizedText(input.tabLabel, input.$type, uniqueLegIndex)
  const stringChild = typeof authoredChildren === 'string' ? normalizedText(authoredChildren, input.$type, uniqueLegIndex) : undefined
  const routeTextLegIndex = input.routeTextLegIndex ?? title.legIndex ?? tabLabel.legIndex
  let body = input.body
  if (input.$type === 'TravelHero' && title.value === '{{tripRoute}}' && body) {
    const summary = legacyTripSummaryPattern.exec(body)
    if (summary) body = `Start {{startDateLong}}, with {{staySummary}}.${summary[1] ?? ''}`
  }
  const children = Array.isArray(authoredChildren)
    ? normalizedChildren.map(child => child.node)
    : authoredChildren && typeof authoredChildren !== 'string'
      ? normalizedChildren[0]?.node
      : stringChild?.value ?? authoredChildren
  return {
    node: {
      ...input,
      ...(title.value === undefined ? {} : { title: title.value }),
      ...(tabLabel.value === undefined ? {} : { tabLabel: tabLabel.value }),
      ...(body === undefined ? {} : { body }),
      ...(routeTextLegIndex === undefined ? {} : { routeTextLegIndex }),
      ...(children === undefined ? {} : { children }),
    },
    legIndexes,
  }
}

export function normalizeLegacyRouteTextBindings(root: PresentNode): PresentNode {
  return normalizeNode(root).node
}
