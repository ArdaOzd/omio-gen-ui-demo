import { useLayoutEffect, useRef, type ReactNode, type UIEvent } from 'react'

const visibleFareRows=7
const viewportHeightProperty='--travel-fares-viewport-height'

export function FareList({children,rowIds,onViewportChange}:{children:ReactNode;rowIds:readonly string[];onViewportChange?:(viewport:{offset:number;limit:number;fareIds:string[]})=>void}) {
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
  const publish=()=>{
   const top=list.scrollTop,bottom=top+list.clientHeight
   const visible=[...list.children].flatMap((child,index)=>child instanceof HTMLElement&&child.offsetTop+child.offsetHeight>top&&child.offsetTop<bottom?[index]:[])
   const first=visible[0]??0,last=visible.at(-1)??Math.min(rowIds.length-1,visibleFareRows-1)
   onViewportChange?.({offset:first,limit:Math.max(0,last-first+1),fareIds:rowIds.slice(first,last+1)})
  }
  const measure=()=>{
   const styles=getComputedStyle(list)
   const gap=Number.parseFloat(styles.rowGap||styles.gap)||0
   const height=rows.reduce((total,row)=>total+row.getBoundingClientRect().height,0)+gap*Math.max(0,rows.length-1)
   if(height>0)list.style.setProperty(viewportHeightProperty,`${Math.ceil(height)}px`)
   publish()
  }
  measure()
  if(typeof ResizeObserver==='undefined')return
  const observer=new ResizeObserver(measure)
  rows.forEach(row=>observer.observe(row))
  return()=>observer.disconnect()
 },[layoutKey,scrollable,onViewportChange])
 const onScroll=(event:UIEvent<HTMLDivElement>)=>{
  const list=event.currentTarget,top=list.scrollTop,bottom=top+list.clientHeight
  const visible=[...list.children].flatMap((child,index)=>child instanceof HTMLElement&&child.offsetTop+child.offsetHeight>top&&child.offsetTop<bottom?[index]:[])
  const first=visible[0]??0,last=visible.at(-1)??Math.min(rowIds.length-1,visibleFareRows-1)
  onViewportChange?.({offset:first,limit:Math.max(0,last-first+1),fareIds:rowIds.slice(first,last+1)})
 }
 return <div ref={listRef} className="travel-fares" role="region" aria-label="Fare options" data-scrollable={scrollable} tabIndex={scrollable?0:undefined} onScroll={onScroll}>{children}</div>
}
