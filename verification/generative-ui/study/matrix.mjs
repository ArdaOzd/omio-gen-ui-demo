export const cacheConditions=['cold','warm']
export const wordings=['fixed','withheld']
export function buildMatrix(scenarios,{selected=['all'],seed=17}={}){
 return scenarios.flatMap((scenario,index)=>selected.includes('all')||selected.includes(scenario.id)?cacheConditions.flatMap((cache,condition)=>wordings.flatMap((wording,repetition)=>{
  const order=(index+condition+repetition)%2===0?['a','b']:['b','a']
  return order.map((variant,position)=>({id:`${scenario.id}-${cache}-${wording}-${variant}`,scenario:scenario.id,index,cache,wording,variant,order,position,seed,participant:`anonymous-${index}-${condition}-${repetition}`}))
 })):[])
}
export function summarize(records){
 const passing=records.filter(record=>record.outcome==='pass').length
 return {cells:records.length,passing,failing:records.length-passing,byVariant:Object.fromEntries(['a','b'].map(variant=>[variant,{cells:records.filter(record=>record.variant===variant).length,passing:records.filter(record=>record.variant===variant&&record.outcome==='pass').length}])),humanRatings:null}
}
export const withheld=[
 'Explore London to Paris October 9–15, 2026 for one passenger. Put cheap choices and quick choices in separate sections, make duration versus price visible, and let me switch modes and inspect a selected journey.',
 'I need a visual London-to-Paris train/bus comparison for October 9–15, 2026. Lead with a compact comparison, then group choices by departure day in a calendar and put filters beside the results.',
 'Build a calendar-first London-to-Paris exploration for October 9–15, 2026. Show cheapest prices by day, a duration/price comparison and filtered offers. Let an action reveal a journey timeline after I select an offer.',
 'Arrange a mixed-mode three-city journey London→Paris→Barcelona from October 9, 2026, staying two nights in Paris and four in Barcelona. Use one control section per leg, place the route and selected total first, and keep all alternatives locally selectable.',
 'Recompose these loaded choices around a timeline with the selected itinerary above the offers and filters in a compact side section. Preserve current dates, modes and selections.',
 'Use words only to tell me the active departure date, selected transport modes, selected fare count and stay lengths. Keep every current interactive view unchanged.',
 'Give me fare cards with a date chooser, mode buttons and a sort menu for London→Paris October 9–15, 2026. Put the filters before the cards and a selected itinerary after them; I will operate the controls locally.',
 'For London→Paris October 9–15, 2026, place a date chooser and fare choices together. I will rapidly move to dates beyond this window; the most recent date must win over a slow earlier request.',
 'Stream a new arrangement for this trip, with modes before the calendar and fares plus selected itinerary after it. Preserve my filter edits made before your replacement has finished.',
 'Keep the current trip, but create another independent travel view for London→Paris October 9–15, 2026 using the same resources. Lead the new view with the calendar and give it its own modes, dates and fare selection.',
 'Create an interactive London→Paris October 9–15, 2026 view with modes, dates, sorting, fares and selected itinerary. I will select a fare and reload; preserve the conversation and choices even after partially loaded coverage.',
 'Compose London→Paris October 9–15, 2026 with modes, dates, sorting and fares. I may stop and retry a replacement; keep the existing artifact usable and recover from one invalid scene without losing my choices.'
]
