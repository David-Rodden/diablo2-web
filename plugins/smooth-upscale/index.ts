import { createTogglePlugin } from '../../src/client/plugin-host/api.ts'

export const smoothUpscalePlugin = createTogglePlugin({
  id: 'smooth-upscale',
  name: { zh: '平滑放大（FSR）', en: 'Smooth Upscaling (FSR)' },
  description: {
    zh: '非 1.13c 增强：游戏画面以原生分辨率渲染后，用 AMD FidelityFX 超分辨率 1（边缘自适应放大 + 锐化）放大到屏幕实际分辨率，消除锯齿与块状像素。关闭插件即恢复整数倍清晰像素放大。',
    en: "Non-1.13c enhancement: renders the world at native resolution and upscales it to your screen's real resolution with AMD FidelityFX Super Resolution 1 (edge-adaptive upscaling plus sharpening), smoothing jagged and blocky edges. Disabling restores crisp whole-pixel scaling.",
  },
  port: (ctx) => ctx.smoothUpscale,
})
