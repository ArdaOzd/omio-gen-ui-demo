import { useLayoutEffect, useRef, type ReactNode } from 'react'

const visibleFareRows=7
const viewportHeightProperty='--travel-fares-viewport-height'

export function FareList({children,rowIds}:{children:ReactNode;rowIds:readonly string[]}) {
 const listRef=useRef<HTMLDivElement>(null)
 const scrollable=rowIds.length>visibleFareRows
 const layoutKey=rowIds.join('\u0000')
 useLayoutEffect(()=>{
  const list=listRef.current
  if(!list)return
  list.style.removeProperty(viewportHeightProperty)
  list.scrollTop=0
  if(!scrollable)return
  const rows:HTMLElement[]=[]
  for(let index=0;index<visibleFareRows;index++){
   const row=list.children.item(index)
   if(row instanceof HTMLElement)rows.push(row)
  }
  const measure=()=>{
   const styles=getComputedStyle(list)
   const gap=Number.parseFloat(styles.rowGap||styles.gap)||0
   const height=rows.reduce((total,row)=>total+row.getBoundingClientRect().height,0)+gap*Math.max(0,rows.length-1)
   if(height>0)list.style.setProperty(viewportHeightProperty,`${Math.ceil(height)}px`)
  }
  measure()
  if(typeof ResizeObserver==='undefined')return
  const observer=new ResizeObserver(measure)
  rows.forEach(row=>observer.observe(row))
  return()=>observer.disconnect()
 },[layoutKey,scrollable])
 return <div ref={listRef} className="travel-fares" role="region" aria-label="Fare options" data-scrollable={scrollable} tabIndex={scrollable?0:undefined}>{children}</div>
}
