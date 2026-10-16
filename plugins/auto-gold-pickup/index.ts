import { createTogglePlugin } from '../../src/client/plugin-host/api.ts'

export const autoGoldPickupPlugin = createTogglePlugin({
  id: 'auto-gold-pickup',
  name: { zh: '自动拾取金币', en: 'Auto Gold Pickup' },
  description: {
    zh: '非 1.13c 增强：自动拾取身边（伸手可及范围内）的地面金币，无需点击。不会为了金币改变你的移动路线；身上金币已满时暂停。关闭插件即恢复原版行为。',
    en: "Non-1.13c enhancement: picks up any gold on the ground within arm's reach automatically, without clicking. It never changes where you're walking, and pauses while you're carrying the maximum gold. Disabling restores vanilla behavior.",
  },
  port: (ctx) => ctx.autoGoldPickup,
})
