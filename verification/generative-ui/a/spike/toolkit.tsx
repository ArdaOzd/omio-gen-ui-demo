"use generative";
import { defineToolkit } from '@assistant-ui/react'
import { JSONGenerativeUI, defineGenerativeComponents } from '@assistant-ui/react-generative-ui'
import { z } from 'zod'
import { SpikeSurface, SpikeCard } from './components'

const generative = new JSONGenerativeUI({ library: defineGenerativeComponents({
  TravelSurface: { description: 'Recursive travel section.', properties: z.object({ title: z.string().max(100).optional() }), streamProperties: true, render: (props) => <SpikeSurface {...props} /> },
  FareCard: { description: 'An option card.', properties: z.object({ title: z.string().max(100) }), render: (props) => <SpikeCard {...props} /> },
}) })
export default defineToolkit({ present: generative.present() })
