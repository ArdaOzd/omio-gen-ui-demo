import type { UICommand,UIStateStore } from '../contracts'
export function createActionRouter(store:UIStateStore){return(command:UICommand)=>store.dispatch({...command,expectedRevision:command.expectedRevision??store.get(command.artifactId).revision})}
