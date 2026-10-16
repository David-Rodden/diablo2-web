import { createTogglePlugin } from '../../src/client/plugin-host/api.ts'

export const smoothTextPlugin = createTogglePlugin({
  id: 'smooth-text',
  name: { zh: '平滑文字', en: 'Smooth Text' },
  description: {
    zh: '非 1.13c 增强：以屏幕实际分辨率的抗锯齿矢量字形（D2 Exocet / Formal 字体）绘制文字，字形位置与原版点阵字体完全一致，排版不变。关闭插件即恢复原版点阵字体。',
    en: "Non-1.13c enhancement: draws text with anti-aliased vector glyphs (the D2 Exocet / Formal typefaces) at your screen's real resolution, placed exactly where the original bitmap glyphs go so no layout changes. Disabling restores the original bitmap fonts.",
  },
  port: (ctx) => ctx.smoothText,
})
