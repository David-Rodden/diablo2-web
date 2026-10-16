import { describe, expect, it } from 'vitest'
import {
  containsCjkCharacters,
  validatePluginRegistry,
  type PluginSmoothTextPort,
  type PluginSessionView,
} from '../../src/client/plugin-host/api.ts'
import { PluginHost } from '../../src/client/plugin-host/plugin-host.ts'
import { PluginConfigStore } from '../../src/client/plugin-host/plugin-config-store.ts'
import { BUILTIN_PLUGINS } from '../../plugins/index.ts'
import { smoothTextPlugin } from '../../plugins/smooth-text/index.ts'

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

function createPortStub(): PluginSmoothTextPort & { enabled: boolean } {
  const stub: PluginSmoothTextPort & { enabled: boolean } = {
    enabled: false,
    isEnabled: () => stub.enabled,
    setEnabled: (value: boolean) => {
      stub.enabled = value
    },
  }
  return stub
}

function createHost(port: PluginSmoothTextPort | null) {
  return new PluginHost({
    plugins: [smoothTextPlugin],
    configStore: new PluginConfigStore([smoothTextPlugin], { storage: new MemoryStorage() }),
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
    smoothText: port,
    autoStart: false,
  })
}

describe('smooth-text plugin', () => {
  it('is registered as a valid, default-on toggle', () => {
    expect(BUILTIN_PLUGINS).toContain(smoothTextPlugin)
    expect(() => validatePluginRegistry([smoothTextPlugin])).not.toThrow()
    expect(smoothTextPlugin.defaultEnabled).toBe(true)
    expect(smoothTextPlugin.settings).toBeUndefined()
    expect(containsCjkCharacters(smoothTextPlugin.name.en)).toBe(false)
    expect(containsCjkCharacters(smoothTextPlugin.description.en)).toBe(false)
  })

  it('turns smooth text on while active and off on teardown', async () => {
    const port = createPortStub()
    const host = createHost(port)
    await host.start()
    expect(port.enabled).toBe(true)
    expect(host.getStatus('smooth-text').level).toBe('ok')
    await host.destroy()
    expect(port.enabled).toBe(false)
  })

  it('disabling the plugin restores the bitmap fonts', async () => {
    const port = createPortStub()
    const host = createHost(port)
    await host.start()
    await host.setEnabled('smooth-text', false)
    expect(port.enabled).toBe(false)
    await host.setEnabled('smooth-text', true)
    expect(port.enabled).toBe(true)
    await host.destroy()
  })

  it('reports an error instead of silently doing nothing when the port is not wired', async () => {
    const host = createHost(null)
    await host.start()
    expect(host.getStatus('smooth-text').level).toBe('error')
    await host.destroy()
  })
})
