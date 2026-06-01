# Huohuo Weather Glass

基于 Sky Blog Theme 二次开发的动态天气玻璃风 Halo 主题。主题围绕天气、光线和玻璃拟态重做视觉表现，支持白天动态云层、黄昏火烧云、夜间雨景视频背景，以及全站玻璃卡片效果。

[![Halo](https://img.shields.io/badge/Halo-2.23.0+-blue)](https://halo.run)
[![License](https://img.shields.io/badge/License-GPL--3.0-green)](LICENSE)
[![Release](https://img.shields.io/github/v/release/huohuo-huo/-theme-sky-weather)](https://github.com/huohuo-huo/-theme-sky-weather/releases)

## 预览

| 项目 | 链接 |
| --- | --- |
| 在线演示 | [huohuospace.cn](https://huohuospace.cn) |
| 主题仓库 | [huohuo-huo/-theme-sky-weather](https://github.com/huohuo-huo/-theme-sky-weather) |
| 问题反馈 | [GitHub Issues](https://github.com/huohuo-huo/-theme-sky-weather/issues) |

## 主要特性

- 动态天气玻璃背景：白天云层、黄昏火烧云、夜间雨景视频背景。
- 全站玻璃卡片：文章、列表、侧边栏、页脚、瞬间、图库等区域统一玻璃质感。
- 夜间视频播放列表：支持多段雨景视频顺序播放，并可配置透明度、雨量、风向和速度。
- PJAX 生命周期适配：图库、文档、瞬间发布、天气背景等脚本在页面切换后可重新初始化。
- 文档页优化：适配 Docsme 文档页、目录、长文档渐进加载和代码块高亮刷新。
- 多内容页面：文章、分类、标签、归档、作者、图库、友链、朋友圈、文档、追番、装备、Steam、豆瓣。
- 可配置布局：分类列表支持现代、杂志、媒体、极简等样式，标签页和文章页已做卡片化优化。

## 兼容版本

- Halo：`>= 2.23.0`
- 当前主题版本：`1.0.25`
- 许可证：GPL-3.0

## 安装

请下载 Release Assets 中的主题安装包，不要下载 GitHub 自动生成的 `Source code (zip)` 或 `Source code (tar.gz)`。

1. 打开 [Releases](https://github.com/huohuo-huo/-theme-sky-weather/releases)。
2. 下载 `theme-sky-weather-v1.0.25.zip`。
3. 进入 Halo 后台。
4. 打开「外观」->「主题」->「安装主题」。
5. 上传下载的 zip 文件并启用主题。

## 推荐配置

启用主题后，可以在「主题设置」中重点检查这些配置：

| 设置区域 | 建议 |
| --- | --- |
| 通用设置 | 选择明暗主题、侧边栏位置、加载动画和悬浮控制栏 |
| 顶部设置 | 配置站点 Logo、导航菜单、搜索和主题切换 |
| 首页设置 | 启用天气玻璃背景，配置云层、雨景视频、首页模块顺序 |
| 文章设置 | 配置文章头图、目录、分享、点赞和侧边栏组件 |
| 分类/标签 | 选择列表风格，当前版本已重点优化极简卡片样式 |
| 页脚设置 | 配置备案、社交链接、主题开源链接和运行天数 |

## 文档页说明

主题提供 Docsme 文档页适配，包含文档列表、详情页、目录、长文档渐进加载和代码块样式修复。`v1.0.24` 修复了文档页代码块被全局 `code` 样式压成单行、长文档滚动懒加载后 Shiki 未重新高亮的问题。`v1.0.25` 修复了 `v1.0.24` 包中部分模板文件编码损坏导致的页面解析失败问题。

已知边界：中文文档路径 404 属于 Docsme 插件路由编码匹配问题，不是主题模板链接问题，也不是 Halo Core 问题。若你的站点使用 Docsme 且文档 slug 为中文，遇到子文档 404 时，建议临时改用英文/拼音 slug，或等待 Docsme 插件侧修复。本站线上曾通过插件补丁修复该问题，但主题安装包不会包含第三方插件 jar 补丁。

## 天气玻璃背景

天气玻璃背景是本主题的核心视觉模块。

| 模式 | 表现 |
| --- | --- |
| 白天 | 明亮天空渐变、动态云层、柔和光晕 |
| 黄昏 | 暖色火烧云、日落光线、低饱和玻璃卡片 |
| 夜间 | 雨景视频背景、Canvas 雨线、暗色玻璃卡片 |
| 自动 | 根据当前主题明暗模式切换天气氛围 |

夜间背景视频位于：

```text
templates/assets/videos/
```

默认包含多段 `night-rain-pool-*.mp4`，可以在主题设置中配置播放列表、播放顺序和透明度。

## 插件适配

主题可以独立用于普通博客页面。以下插件用于启用对应扩展页面：

| 插件 | 用途 | 说明 |
| --- | --- | --- |
| plugin-moments | 瞬间 | 瞬间列表、详情页、前端发布 |
| plugin-photos | 图库 | 瀑布流图库、照片详情 |
| plugin-links | 友链 | 友情链接展示 |
| plugin-friends | 朋友圈 | RSS 聚合动态 |
| plugin-docsme | 文档 | 文档中心、文档详情、目录 |
| plugin-bilibili-bangumi | 追番 | 追番列表与卡片 |
| plugin-steam | Steam | Steam 游戏库和侧边栏卡片 |
| plugin-equipment | 装备 | 装备展示页面 |
| plugin-douban | 豆瓣 | 豆瓣记录页面 |
| plugin-search-widget | 搜索 | 全站搜索入口 |
| plugin-comment-widget | 评论 | 评论组件 |

瞬间前端发布建议使用本地存储、S3 或 OSS。Alist 存储当前不作为瞬间发布后端。

## 页面支持

| 页面 | 模板 |
| --- | --- |
| 首页 | `index.html` |
| 文章详情 | `post.html` |
| 独立页面 | `page.html` |
| 关于页 | `page_about.html` |
| 分类 | `categories.html`、`category.html` |
| 标签 | `tags.html`、`tag.html` |
| 归档 | `archives.html` |
| 作者 | `author.html` |
| 瞬间 | `moments.html`、`moment.html` |
| 图库 | `photos.html`、`photo.html` |
| 友链 | `links.html` |
| 朋友圈 | `friends.html` |
| 文档 | `docs.html`、`doc.html`、`doc-catalog.html` |
| 追番 | `bangumis.html` |
| Steam | `steam.html` |
| 装备 | `equipments.html` |
| 豆瓣 | `douban.html` |

## 发布说明

本仓库保存的是可直接安装的主题成品。发布流程如下：

1. 更新 `theme.yaml` 中的 `spec.version`。
2. 推送代码到 `main`。
3. 创建版本 tag 并推送。
4. GitHub Actions 会自动创建 Release，并上传 `theme-sky-weather-v1.0.25.zip`。

## 反馈

问题反馈和功能建议请提交到：

[GitHub Issues](https://github.com/huohuo-huo/-theme-sky-weather/issues)

## 致谢

本主题基于 [Sky Blog Theme](https://github.com/sky121666/halo-theme-sky-blog-1) 二次开发，保留 GPL-3.0 许可。

感谢这些项目与生态：

- [Halo](https://github.com/halo-dev/halo)
- [Sky Blog Theme](https://github.com/sky121666/halo-theme-sky-blog-1)
- [Tailwind CSS](https://tailwindcss.com/)
- [DaisyUI](https://daisyui.com/)
- [Alpine.js](https://alpinejs.dev/)

## 许可证

[GPL-3.0](LICENSE)
