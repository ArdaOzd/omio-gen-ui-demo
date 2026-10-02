import { createContext,useContext } from 'react'
import type { BoundedQueryResult } from '../../../contracts'
type Binding={kind:string;artifactRef:string;datasetRef?:string;title?:string;queryId:string}
const context=createContext<{bindings:Binding[];execute:(id:string,signal:AbortSignal,kind?:string)=>Promise<BoundedQueryResult>}|null>(null)
export const SceneQueryProvider=context.Provider
export function useSceneQuery(){return useContext(context)}
