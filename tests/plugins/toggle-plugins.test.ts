import { describe, expect, it } from 'vitest'
import { containsCjkCharacters, validatePluginRegistry, type PluginSessionView, type PluginTogglePort } from '../../src/client/plugin-host/api.ts'
import { PluginConfigStore } from '../../src/client/plugin-host/plugin-config-store.ts'
import { PluginHost } from '../../src/client/plugin-host/plugin-host.ts'
import { BUILTIN_PLUGINS } from '../../plugins/index.ts'
import { dragInteractPlugin } from '../../plugins/drag-interact/index.ts'
import { smoothTextPlugin } from '../../plugins/smooth-text/index.ts'

const memoryStorage = () => {
  const map = new Map<string, string>()
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) }
}

const portStub = () => {
  const stub = { enabled: false, isEnabled: () => stub.enabled, setEnabled: (v: boolean) => void (stub.enabled = v) }
  return stub
}

describe.each([
  { plugin: dragInteractPlugin, portName: 'dragInteract' },
  { plugin: smoothTextPlugin, portName: 'smoothText' },
])('$plugin.id toggle plugin', ({ plugin, portName }) => {
  const createHost = (port: PluginTogglePort | null) =>
    new PluginHost({
      plugins: [plugin],
      configStore: new PluginConfigStore([plugin], { storage: memoryStorage() }),
      session: { phase: 'lobby', world: {}, loginHost: null, getSnapshot: () => ({}), onServerEvent: () => () => {}, onStateChange: () => () => {} } as unknown as PluginSessionView,
      toolbar: { setPluginsButtonState() {}, addContribution: () => () => {} },
      [portName]: port,
      autoStart: false,
    })

  it('is registered as a valid, default-on toggle', () => {
    expect(BUILTIN_PLUGINS).toContain(plugin)
    expect(() => validatePluginRegistry([plugin])).not.toThrow()
    expect(plugin.defaultEnabled).toBe(true)
    expect(plugin.settings).toBeUndefined()
    expect(containsCjkCharacters(plugin.name.en) || containsCjkCharacters(plugin.description.en)).toBe(false)
  })

  it('turns the port on while active and off on teardown', async () => {
    const port = portStub()
    const host = createHost(port)
    await host.start()
    expect([port.enabled, host.getStatus(plugin.id).level]).toEqual([true, 'ok'])
    await host.destroy()
    expect(port.enabled).toBe(false)
  })

  it('disabling the plugin restores vanilla behaviour', async () => {
    const port = portStub()
    const host = createHost(port)
    await host.start()
    await host.setEnabled(plugin.id, false)
    expect(port.enabled).toBe(false)
    await host.setEnabled(plugin.id, true)
    expect(port.enabled).toBe(true)
    await host.destroy()
  })

  it('reports an error instead of silently doing nothing when the port is not wired', async () => {
    const host = createHost(null)
    await host.start()
    expect(host.getStatus(plugin.id).level).toBe('error')
    await host.destroy()
  })
})
