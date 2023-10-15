

class ContextProvider<T> {
  private stack: T[] = []
  
  provideContext<R>(value: T, fn: () => R): R {
    this.stack.push(value)
    // This only works because the functions are not async
    const result = fn()
    this.stack.pop()
    return result
  }
  getContext(): T {
    if (this.stack.length == 0) {
      throw Error(`No context provided`)
    }
    return this.stack[this.stack.length-1]
  }
}
 

export function defineContext<T>() {
  return new ContextProvider<T>()
}
