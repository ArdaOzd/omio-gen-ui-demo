import type { ToolCallMessagePartProps } from '@assistant-ui/react'
import nativeToolkit from './toolkit'
import { PresentBoundary } from './present-boundary'
const nativePresent=nativeToolkit.present
/** Preserve native parameters and the empty completion result; bound only rendering. */
export default {...nativeToolkit,present:{...nativePresent,render:(props:ToolCallMessagePartProps<Record<string,unknown>,Record<string,never>>)=><PresentBoundary {...props} nativeRender={nativePresent.render}/>}}
