# 墨香书阁 (Mo Xiang Shu Ge)

墨香书阁是一个基于 React 和 Web 技术的轻量级 EPUB 电子书阅读与管理系统。它的最大特色是**将 GitHub 仓库作为个人的“云端书库”**，实现在线存储、跨平台访问与沉浸式阅读。

## ✨ 主要功能 (Features)

- **☁️ 云端托管，数据自主：** 基于 GitHub API (Octokit) 将 `.epub` 文件上传并存储在您个人的 GitHub 仓库中（`book/` 目录下），数据安全且完全由自己掌控。
- **📖 沉浸式阅读体验：**
  - 核心阅读引擎采用 `epubjs` 构建。
  - 支持 **左右翻页** (Paginated) 与 **垂直滚动** (Scrolled) 两种阅读模式。
  - 支持多种主题切换（默认、羊皮纸、护眼绿、夜间模式）。
  - 支持章节目录 (TOC) 跳转以及字体大小的自由缩放。
- **💾 进度记忆：** 自动在本地浏览器缓存中记录每本书的阅读进度，下次打开直接跳转至上次阅读位置。
- **📚 智能分类与检索：**
  - 解析上传书籍的文件名结构（如 `小说_三体.epub`），自动提取前缀作为分类标签。
  - 书架页面支持根据书名和分类进行全局模糊搜索。
- **🗑️ 藏书管理：** 可随时通过设置开启“删除模式”，直接从您的 GitHub 书库中彻底移除书籍。

## 🚀 快速开始配置

1. **准备 GitHub 书库：**
   - 在 GitHub 创建一个新仓库（例如 `my-bookshelf`）。
   - 在该仓库的根目录下创建一个名为 `book` 的文件夹。
   - 前往 [GitHub Settings -> Tokens](https://github.com/settings/tokens?type=beta) 生成一个具有对应仓库 **Read/Write** Content 权限的 **Fine-grained PAT**。
2. **本地运行开发：**
   ```bash
   npm install
   npm run dev
   ```
3. **系统配置：**
   - 在浏览器中打开应用，点击底部导航栏进入 **“设置”** 页面。
   - 将您的 **GitHub Token**、**GitHub 用户名**、**仓库名称** 填写完成并保存配置。
4. **开启阅读：**
   - 进入 **“上传”** 页面，选择 `.epub` 格式文件并输入标题和分类进行上传。
   - 前往首页的 **“我的书架”** 点击书籍即可开始阅读。

## 🔐 存储配置 (LocalStorage)
本应用的所有配置均为**纯客户端存储**，数据仅保存在您的浏览器本地，极大保证了隐私安全。如果您需要通过编程方式（如脚本注入或自动装配）写入配置，可以使用以下特定的 `localStorage` 键名：
- `gh-bookhub-token` (String): 存放您的 GitHub Token
- `gh-bookhub-owner` (String): 存放您的 GitHub 用户名
- `gh-bookhub-repo` (String): 存放您用于存储书籍的仓库名
- `delete_mode` (Boolean): 存放“删除模式”状态。
- `read_pos_${url}` (String): 存放对应书籍的阅读进度 (基于 `cfi` 定位)。
- 其他阅读设置 (`reader_theme`, `reader_font_size`, `reader_flow`): 存放您偏好的阅读皮肤、字号以及翻页模式。

## 🛠️ 技术栈

- **构建与框架：** React 19 + Vite 6
- **UI & 样式：** Tailwind CSS v4 + Motion 动画 + Lucide 图标库
- **路由：** React Router v7
- **EPUB 解析：** epubjs
- **API 交互：** Octokit (GitHub REST API)
