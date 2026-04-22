# 墨香书阁 (Mo Xiang Shu Ge)

墨香书阁是一个基于 React 和 Web 技术的轻量级 EPUB / PDF 电子书阅读与管理系统。它的最大特色是**将 GitHub 仓库作为个人的“云端书库”**，实现在线存储、跨平台访问与沉浸式阅读。

## ✨ 主要功能 (Features)

- **📚 多格式支持**：完美支持 EPUB 和 PDF 电子书，采用 `pdf.js` 深度集成渲染。
- **🖼️ 自动封面解析**：上传时自动提取 EPUB 封面或 PDF 首页作为预览，并在 GitHub 仓库同步存储。
- **🌙 全站主题切换**：支持深色模式与浅色模式，多种阅读主题（羊皮纸、护眼绿等）深度适配 PDF。
- **⚡ 离线阅读 (PWA)**：自动缓存已读书籍至 IndexedDB，支持无网络环境下流畅阅读。
- **🛠️ 书籍管理**：支持在线重命名（修改标题/分类）、批量选择与一键删除。
- **🚀 零后端部署**：完全基于 GitHub API，您的数据永远属于您。

## 🛠️ 技术栈

- **框架**: React 19 + Vite 6
- **样式**: Tailwind CSS v4 + Motion (动画)
- **解析**: epub.js (EPUB) + pdfjs-dist (PDF)
- **存储**: GitHub API (云端) + idb-keyval (IndexedDB)
- **图标**: Lucide React

## 🚀 快速开始配置

1. **准备 GitHub 书库：**
   - 在 GitHub 创建一个新仓库（例如 `my-bookshelf`）。
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
   - 进入 **“上传”** 页面，选择 `.epub` 或 `.pdf` 格式文件并输入标题和分类进行上传。
   - 前往首页的 **“我的书架”** 点击书籍即可开始阅读。

## 🔐 存储说明 (Security & Privacy)

本应用的所有配置均为**纯客户端存储**，Token 和仓库信息仅保存在您的浏览器本地 `localStorage` 中，不会上传到任何第三方服务器。书籍文件存储在您的私有 GitHub 仓库，缓存存储在您的本地 `IndexedDB`。

## 许可

MIT License
