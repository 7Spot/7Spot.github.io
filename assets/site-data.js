// 7Spot 的内容数据。加小东西、记发布、开关造梦都改这里，不用碰页面。
window.SITE = {
  // 造梦开关：只有作者说「造梦」/「不造梦」才改。开着时首页显示「在造梦」（发布当天除外）。
  dreaming: true,

  // 发布记录：只有作者说「醒了：一句话」才加一条。新的放最上面。
  // 发布当天首页显示「今天醒过」，之后「昨天 / 前天 / N 天前醒过」。
  // 格式：{ date: "2026-11-01", item: "deskmate", note: "同桌 1.0 可以下载了" }
  wakes: [],

  // 开发伙伴：关于页落款胶囊点一下显示的名单。以后换模型就往后加。
  credits: ["JUN7", "Claude Fable 5.1", "ChatGPT GPT-6"],

  // 小东西。status：developing 造梦中 / released 已发布
  items: [
    {
      id: "deskmate",
      no: "01",
      title: "同桌",
      sub: "住在你桌面上的一只宠物",
      bubble: "住在你桌面上的\n一只宠物",   // 气泡里的换行位置
      kind: "Mac 应用",
      status: "developing"
    }
  ]
};
