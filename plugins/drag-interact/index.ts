import {
  type D2WebPlugin,
  type PluginContext,
  type PluginInstance,
  type PluginStatus,
} from '../../src/client/plugin-host/api.ts'

export function createDragInteractPlugin(): D2WebPlugin {
  return {
    id: 'drag-interact',
    name: {
      zh: '按住拖动即交互',
      en: 'Hold-and-Drag Interact',
    },
    description: {
      zh: '非 1.13c 增强：按住左键拖动时，光标下的目标会被直接处理——经过敌人即攻击，经过身边的地面物品即拾取，无需松开再点击。城镇 NPC、传送点与箱子等仍需单独点击，避免拖动时误触。关闭插件即恢复原版按住行为（按下时锁定目标，拖动只会行走）。',
      en: 'Non-1.13c enhancement: while you hold the left button and drag, whatever is under the cursor is acted on — hostile monsters are attacked and nearby ground items are picked up, with no need to release and click again. Town NPCs, waypoints and chests still need their own click so dragging never triggers them by accident. Disabling restores the vanilla hold behavior (the target is locked on press and dragging only walks).',
    },
    defaultEnabled: true,
    activate(ctx: PluginContext): PluginInstance {
      ctx.dragInteract.setEnabled(true)
      return {
        getStatus(): PluginStatus {
          const active = ctx.dragInteract.isEnabled()
          return {
            level: active ? 'ok' : 'warn',
            text: active ? { zh: '已开启', en: 'Active' } : { zh: '未开启', en: 'Inactive' },
          }
        },
        deactivate(): void {
          ctx.dragInteract.setEnabled(false)
        },
      }
    },
  }
}

export const dragInteractPlugin: D2WebPlugin = createDragInteractPlugin()
