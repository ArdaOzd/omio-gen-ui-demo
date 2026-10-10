export function abortable<T>(promise:Promise<T>,signal:AbortSignal):Promise<T>{
  signal.throwIfAborted()
  return new Promise<T>((resolve,reject)=>{
    const aborted=()=>reject(signal.reason??new DOMException('Aborted','AbortError'))
    signal.addEventListener('abort',aborted,{once:true})
    promise.then(
      value=>{signal.removeEventListener('abort',aborted);resolve(value)},
      error=>{signal.removeEventListener('abort',aborted);reject(error)},
    )
  })
}
