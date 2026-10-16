import {
  type D2WebPlugin,
  type PluginContext,
  type PluginInstance,
  type PluginStatus,
} from '../../src/client/plugin-host/api.ts'

export function createSmoothTextPlugin(): D2WebPlugin {
  return {
    id: 'smooth-text',
    name: {
      zh: '平滑文字',
      en: 'Smooth Text',
    },
    description: {
      zh: '非 1.13c 增强：以屏幕实际分辨率的抗锯齿矢量字形（D2 Exocet / Formal 字体）绘制游戏内文字，字形位置与原版点阵字体完全一致，排版不变。关闭插件即恢复原版点阵字体。',
      en: 'Non-1.13c enhancement: draws in-game text with anti-aliased vector glyphs (the D2 Exocet / Formal typefaces) at your screen\'s real resolution, placed exactly where the original bitmap glyphs go so no layout changes. Disabling restores the original bitmap fonts.',
    },
    defaultEnabled: true,
    activate(ctx: PluginContext): PluginInstance {
      ctx.smoothText.setEnabled(true)
      return {
        getStatus(): PluginStatus {
          const active = ctx.smoothText.isEnabled()
          return {
            level: active ? 'ok' : 'warn',
            text: active ? { zh: '已开启', en: 'Active' } : { zh: '未开启', en: 'Inactive' },
          }
        },
        deactivate(): void {
          ctx.smoothText.setEnabled(false)
        },
      }
    },
  }
}

export const smoothTextPlugin: D2WebPlugin = createSmoothTextPlugin()
