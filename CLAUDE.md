# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目
- 7Spot：JUN7 的个人网站，https://7spot.github.io 。发布好玩的小软件/小组件和生活内容。
- 受众：完全不懂代码的人。文案中文、口语化，步骤像说明书，不出现术语。
- 站名 7Spot，作者署名 JUN7，两者不混。
- 仓库公开，所有文件和提交记录都能被看到。

## 技术
- 纯静态 HTML/CSS/JS。无构建、无框架、无包管理、无测试。
- `.nojekyll`：GitHub 原样托管，不经 Jekyll。
- 页面须适配手机宽度和深色模式。

## 命令
- 本地预览：`python3 -m http.server 8000` → http://localhost:8000
- 发布（仅用户说「发布」时）：`git switch main && git merge --ff-only dev && git push && git switch dev`，1–2 分钟生效。
- 查发布状态：`gh api repos/7Spot/7Spot.github.io/pages --jq .status`

## 目录约定
- `index.html` 首页
- `projects/<slug>/index.html` 单个作品页；下载文件放 `projects/<slug>/files/`
- `assets/` 公共 css / 图片
- 文件名小写英文加连字符；页面间相对路径

## Git
- 两个分支：`dev` 工作区，`main` 已发布版本。网页只跟 main 走。
- 所有改动在 dev 提交。不在 main 上直接提交。
- 用户没说「推送」不推送；没说「发布」不合并 main。推送 dev 只是备份，网页不变。
- `origin` 走 SSH 别名 `github.com-jun7`。账号规则在上级目录 `../CLAUDE.md`，不要改 remote 和 user.*。
- 提交信息：中文一句话，说明改了什么。
- 单文件 < 100MB；大下载包放 GitHub Releases，不进仓库。

## 状态
- main：占位首页。
- 待做：正式首页；桌宠小组件预告页（demo 未完成，素材待用户提供）。
