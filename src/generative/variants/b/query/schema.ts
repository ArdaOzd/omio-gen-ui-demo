import { z } from 'zod'
import { createLibrary, defineComponent, markReactive } from '@openuidev/lang-core'
import { catalogDescriptors, sharedPropsSchema } from '../../../catalog/generated/catalog'
export const BindingSchema=z.enum(['filters','dates','sort','stays','modesByLeg','selectedFareIds'])
export type Binding=z.infer<typeof BindingSchema>
const value=z.unknown().optional();markReactive(value)
export const bPropsSchema=sharedPropsSchema.omit({body:true}).extend({children:z.array(z.unknown()).max(80).optional(),value,binding:BindingSchema.optional(),query:z.unknown().optional(),action:z.unknown().optional(),body:sharedPropsSchema.shape.body})
export const bComponentPropsSchema=(name:string)=>name==='Callout'?bPropsSchema.extend({title:z.string().max(600).optional()}):bPropsSchema.extend({})
export const bSchemaLibrary=createLibrary({root:'TravelSurface',components:catalogDescriptors.map(d=>defineComponent({name:d.name,description:d.description,props:bComponentPropsSchema(d.name),component:null}))})
