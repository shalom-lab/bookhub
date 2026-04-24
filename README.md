# 墨香书阁 (BookHub)

墨香书阁是一个基于 React 19 和 Web 技术的轻量级电子书阅读与管理系统。它的核心理念是**将 GitHub 仓库作为个人的“私有云端书库”**，实现数据永存、跨端访问与纯粹的沉浸式阅读体验。

## ✨ 核心特性 (Key Features)

- **📚 双格式卓越支持**
  - **EPUB**: 基于 `epub.js`，提供精美的翻页效果、字号调节及多种护眼主题（羊皮纸、护眼绿、极夜黑）。
  - **PDF**: 采用高性能渲染引擎，支持原生全屏模式、自适应缩放与侧边缩放导航，告别布局崩溃。
- **🖼️ 智能封面系统**: 自动解析 EPUB 封面或 PDF 首页，让您的书架视觉效果一目了然。
- **⚡ 极致离线体验**: 集成 IndexedDB 持久化存储，已读书籍自动缓存，支持无网络环境下流畅开启。
- **🛠️ 现代化书籍管理**: 支持在线重命名标题、修改分类，配备强大的**批量选择与删除**系统。
- **🌙 灵动主题**: 深度适配深色/浅色模式，交互动效优雅平滑。
- **🚀 零后端架构**: 完全基于 GitHub API，无需服务器，您的书籍永远储存在您自己的私有仓库中。

## 🛠️ 技术底座 (Tech Stack)

- **核心**: [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/)
- **样式与动画**: [Tailwind CSS v4](https://tailwindcss.com/) + [Motion](https://motion.dev/)
- **解析引擎**: [epub.js](https://github.com/futurepress/epub.js/) + [@embedpdf/react-pdf-viewer](https://embedpdf.com/)
- **数据存储**: [GitHub REST API](https://docs.github.com/rest) + [idb-keyval](https://github.com/jakearchibald/idb-keyval)
- **图标库**: [Lucide React](https://lucide.dev/)

## 🚀 快速上手指南

### 1. 配置您的云端书库
- **创建仓库**: 在 GitHub 创建一个新仓库（推荐设为 `Private`）。
- **生成 Token**: 前往 [GitHub Tokens (Fine-grained)](https://github.com/settings/tokens?type=beta) 生成一个 PAT，确保拥有该仓库的 **Read and Write** access to contents 权限。

### 2. 本地运行
```bash
git clone https://github.com/your-username/bookhub.git
cd bookhub
npm install
npm run dev
```

### 3. 应用初始化
- 打开应用，点击导航栏进入 **“设置”**。
- 输入您的 **GitHub Token**、**用户名** 和 **仓库名** 并保存。
- 校验通过后，即可在 **“上传”** 页面开始构建您的私人书架。

## 🔐 安全与隐私 (Privacy)

- **无中转服务器**: 所有 GitHub API 请求均由浏览器直接发出，不经过任何第三方服务器。
- **本地存储**: 您的 Token 和个人配置仅保存在本地 `localStorage` 中。
- **数据所有权**: 所有的书籍文件和元数据均保存在您的私有 GitHub 仓库中，除了您没人能访问。

## 💾 离线缓存与存储逻辑 (Caching Logic)

为了实现无缝的离线阅读体验，BookHub 采用了多层缓存策略：

### 1. 书籍二进制数据 (IndexedDB)
*   **技术**: 使用 `idb-keyval` 操作浏览器 IndexedDB。
*   **存储内容**: 主要是 **EPUB** 文件（PDF 目前采用直接 URL 加载以优化内存）。
*   **键值规范**: 缓存键为 `book_${normalizedUrl}`，其中 URL 会被剔除动态查询参数（如 Token），确保缓存命中的稳定性。
*   **管理**: 用户可以在“设置”页面手动清空所有书籍缓存。

### 2. PWA 资源缓存 (Service Worker)
*   **技术**: `vite-plugin-pwa` + `Workbox`。
*   **预缓存**: 应用运行所需的 HTML、JS、CSS 和 PDF 渲染引擎 (WASM)。
*   **运行时缓存**: 
    *   **GitHub API**: 强制 **NetworkOnly**（不缓存），保护 Token 安全，防止数据过时。
    *   **CDN 内容**: 针对 `raw.githubusercontent.com` 采用 **CacheFirst** 策略。
*   **注意**: 请勿手动在 `fetch` 请求中添加 `Authorization` Header，这会触发 CORS 预检导致 CDN 访问失败。

### 3. 应用状态 (LocalStorage)
*   **GitHub 配置**: Token、用户名和仓库名。
*   **阅读位置**: 每本书的最后阅读进度 (`read_pos_${url}`)。
*   **界面偏好**: 主题模式（深色/浅色）、阅读器字号与背景。

## ⚖️ 许可

[MIT License](./LICENSE)
