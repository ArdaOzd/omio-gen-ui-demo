import type { ReactNode } from 'react'
export function SpikeSurface(props: { title?: string; children?: ReactNode; $status: 'streaming' | 'done' }) {
  return <section data-status={props.$status}><h2>{props.title ?? 'Preparing options'}</h2>{props.children}</section>
}
export function SpikeCard(props: { title: string; children?: ReactNode }) {
  return <article><h3>{props.title}</h3>{props.children}</article>
}
