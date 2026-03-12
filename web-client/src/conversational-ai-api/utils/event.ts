type EventHandler<T extends unknown[]> = (...data: T) => void

export class EventHelper<T> {
  private _eventMap: Map<keyof T, EventHandler<unknown[]>[]> = new Map()

  once<Key extends keyof T>(evt: Key, cb: T[Key]) {
    const wrapper = (...args: unknown[]) => {
      this.off(evt, wrapper as T[Key])
      ;(cb as EventHandler<unknown[]>)(...args)
    }
    this.on(evt, wrapper as T[Key])
    return this
  }

  on<Key extends keyof T>(evt: Key, cb: T[Key]) {
    const cbs = this._eventMap.get(evt) ?? []
    cbs.push(cb as EventHandler<unknown[]>)
    this._eventMap.set(evt, cbs)
    return this
  }

  off<Key extends keyof T>(evt: Key, cb: T[Key]) {
    const cbs = this._eventMap.get(evt)
    if (cbs) {
      this._eventMap.set(
        evt,
        cbs.filter((it) => it !== cb),
      )
    }
    return this
  }

  removeAllEventListeners(): void {
    this._eventMap.clear()
  }

  emit<Key extends keyof T>(evt: Key, ...args: unknown[]) {
    const cbs = this._eventMap.get(evt) ?? []
    for (const cb of cbs) {
      try {
        cb?.(...args)
      } catch (e) {
        const error = e as Error
        console.error(`Error handling event ${String(evt)}: ${error.message}`)
      }
    }
    return this
  }
}
