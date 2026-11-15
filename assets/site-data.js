// 7Spot 的内容数据。加小东西、记发布、开关造梦都改这里，不用碰页面。
window.SITE = {
  // 造梦开关：开着时首页显示「在造梦」（发布当天除外）。
  dreaming: true,

  // 发布记录：新的放最上面。
  // 发布当天首页显示「今天醒过」，之后「昨天 / 前天 / N 天前醒过」。
  // 格式：{ date: "2026-11-01", item: "deskmate", note: "同桌 1.0 可以下载了" }
  wakes: [],

  // 开发伙伴：关于页落款胶囊点一下显示的名单。同一家的放在一个列表里，组内用逗号隔开，组和组之间用 · 隔开。
  credits: ["JUN7", ["Claude Fable 5.2", "Fable 5.1", "Opus 5.5"], ["ChatGPT GPT-6 Astra", "GPT-6.1 Sol"]],

  // 小东西。球里显示：图标、title、sub、kind 和状态；首页以外名字都写成「title：sub」。
  // status：developing 造梦中 / released 已发布
  items: [
    {
      id: "deskmate",
      no: "01",
      title: "同桌",
      sub: "你的桌面宠物",
      kind: "Mac 应用",
      status: "developing",
      // 详情卡「获取」→ 弹窗 → 确定下载。去掉这一项，「获取」就变灰、点不了。
      // os / chip：这个包能在什么设备上用。点「确定下载」时设备对不上，先提醒「此应用只支持 Mac」/「此应用只支持 Apple Silicon 的 Mac」，
      // 用户可以点「仍要下载」。chip: "arm" = 只支持 M 芯片。
      download: {
        url: "https://github.com/7Spot/7Spot.github.io/releases/download/v0.5.5-b44/Deskmate-0.5.5-b44.dmg",
        size: "约 43MB",
        req: "需要Apple Silicon, macOS 26 及以上",
        os: "mac",
        chip: "arm"
      }
    }
  ],

  // 小东西层最后那颗球：和小东西一样大、同一级，但没有下一层，按下只弹一下。
  more: { title: "更多小东西", sub: "敬请期待" }
};
