import { describe, expect, it } from 'vitest'
import {
  containsCjkCharacters,
  validatePluginRegistry,
  type PluginDragInteractPort,
  type PluginSessionView,
} from '../../src/client/plugin-host/api.ts'
import { PluginHost } from '../../src/client/plugin-host/plugin-host.ts'
import { PluginConfigStore } from '../../src/client/plugin-host/plugin-config-store.ts'
import { BUILTIN_PLUGINS } from '../../plugins/index.ts'
import { dragInteractPlugin } from '../../plugins/drag-interact/index.ts'

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  private readonly map = new Map<string, string>()
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
}

function createPortStub(): PluginDragInteractPort & { enabled: boolean } {
  const stub: PluginDragInteractPort & { enabled: boolean } = {
    enabled: false,
    isEnabled: () => stub.enabled,
    setEnabled: (value: boolean) => {
      stub.enabled = value
    },
  }
  return stub
}

function createHost(port: PluginDragInteractPort | null) {
  return new PluginHost({
    plugins: [dragInteractPlugin],
    configStore: new PluginConfigStore([dragInteractPlugin], { storage: new MemoryStorage() }),
    session: {
      phase: 'lobby',
      world: {},
      loginHost: null,
      getSnapshot: () => ({}),
      onServerEvent: () => () => {},
      onStateChange: () => () => {},
    } as unknown as PluginSessionView,
    toolbar: {
      setPluginsButtonState() {},
      addContribution: () => () => {},
    },
    dragInteract: port,
    autoStart: false,
  })
}

describe('drag-interact plugin', () => {
  it('is registered as a valid, default-on toggle', () => {
    expect(BUILTIN_PLUGINS).toContain(dragInteractPlugin)
    expect(() => validatePluginRegistry([dragInteractPlugin])).not.toThrow()
    expect(dragInteractPlugin.defaultEnabled).toBe(true)
    expect(dragInteractPlugin.settings).toBeUndefined()
    expect(containsCjkCharacters(dragInteractPlugin.name.en)).toBe(false)
    expect(containsCjkCharacters(dragInteractPlugin.description.en)).toBe(false)
  })

  it('turns the mode on while active and off on teardown', async () => {
    const port = createPortStub()
    const host = createHost(port)
    await host.start()
    expect(port.enabled).toBe(true)
    expect(host.getStatus('drag-interact').level).toBe('ok')
    await host.destroy()
    expect(port.enabled).toBe(false)
  })

  it('disabling the plugin restores the vanilla hold behavior', async () => {
    const port = createPortStub()
    const host = createHost(port)
    await host.start()
    await host.setEnabled('drag-interact', false)
    expect(port.enabled).toBe(false)
    await host.setEnabled('drag-interact', true)
    expect(port.enabled).toBe(true)
    await host.destroy()
  })

  it('reports an error instead of silently doing nothing when the port is not wired', async () => {
    const host = createHost(null)
    await host.start()
    expect(host.getStatus('drag-interact').level).toBe('error')
    await host.destroy()
  })
})
