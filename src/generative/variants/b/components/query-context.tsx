import { createContext,useContext } from 'react'
import type { BoundedQueryResult,ValidatedQueryIR } from '../../../contracts'
type Binding={kind:string;artifactRef:string;datasetRef?:string;title?:string;queryId:string}
const context=createContext<{artifactId:string;bindings:Binding[];currentQuery:(id:string)=>ValidatedQueryIR;execute:(id:string,signal:AbortSignal,kind?:string,query?:ValidatedQueryIR)=>Promise<BoundedQueryResult>}|null>(null)
export const SceneQueryProvider=context.Provider
export function useSceneQuery(){return useContext(context)}
