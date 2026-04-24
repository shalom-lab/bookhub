# BookHub 开发技巧与实战经验 (Skills & Tips)

本文档总结了在 BookHub 开发过程中积累的实战技巧、架构思路以及针对特定场景的解决方案。

---

## 1. 🚀 “一套代码，双模运行”：本地调试与线上生产的无缝切换

### 痛点场景
应用依赖 GitHub 仓库的文件（PDF/EPUB），但本地开发时不想频繁输入 Token，也不想依赖网络状态。

### 解决方案：虚拟文件桥接 (Virtual File Bridge)
**核心思路**：在 `public` 目录下建立一个模拟的目录结构，并通过统一的数据层进行拦截切换。

1.  **环境配置**：
    在 `.env.development` 中设置 `VITE_USE_MOCK=true`。
2.  **数据层拦截 (`src/lib/api.ts`)**：
    ```typescript
    const isDev = import.meta.env.VITE_USE_MOCK === 'true';

    export const getBookList = async () => {
      if (isDev) {
        // 本地模式：直接读取 public/mock/books.json
        return fetch('/mock/books.json').then(res => res.json());
      }
      // 线上模式：调用 GitHub API
      return fetchFromGitHub();
    };
    ```
3.  **本地资源存放**：
    将测试书籍放入 `public/mock/files/test.epub`。在 `books.json` 中将下载地址指向 `/mock/files/test.epub`。
4.  **优势**：
    *   **无需 Token**：本地开发即开即用。
    *   **逻辑一致**：`Reader` 组件感知的始终是一个 URL，无论是 GitHub 链接还是本地路径，处理逻辑完全一致。
    *   **秒级加载**：本地文件读取，调试体验极佳。

---

## 2. 🎨 零依赖视觉美学 (Pure CSS Aesthetic)

### 经验总结
不要迷信大图或重型素材。在 Web 开发中，**“轻”即是“快”**。

*   **拟真设计**：利用 `box-shadow` 的多层堆叠、`linear-gradient` 的半透明叠加，可以模拟出实体书的侧边厚度、装订折痕和纸张质感。
*   **Serif 力量**：在阅读类应用中，合理使用衬线体（如 `font-serif`）能瞬间提升产品的“书卷气”和专业感。
*   **动效留白**：使用 `motion` (Framer Motion) 时，给进入动画增加微小的 `y` 轴偏移和 `scale` 变化，比单纯的淡入淡出更显高级。

---

## 3. 💾 强健的离线架构 (Robust Offline Architecture)

### 关键点
*   **内存安全**：处理大文件（10MB+）时，必须使用 `URL.createObjectURL` 配合 `useEffect` 的 `cleanup` (执行 `revokeObjectURL`)。否则频繁切换书籍会导致浏览器内存溢出。
*   **请求撤回**：异步请求必须绑定 `AbortController`。用户切换页面时立即中断下载，这是节省移动端流量和提升响应速度的“基操”。
*   **CORS 陷阱**：对 CDN 域名（如 `raw.githubusercontent.com`）进行跨域 `fetch` 时，绝对不要添加自定义 Header（如 `Authorization`），否则会因为 OPTIONS 预检请求失败而导致加载崩溃。

---

## 4. 👤 用户技术风格观察 (Technical Style)

通过合作，我观察到你的技术风格具有以下鲜明特征：

1.  **结果导向 (Pragmatic)**：比起复杂的架构，更看重功能是否快速落地并解决实际痛点（如离线阅读、批量管理）。
2.  **追求极致视觉 (High-Fidelity)**：对 UI 的精致度有极高要求，不能忍受“毛坯房”风格。追求“WOW Factor”，希望用户第一眼就被惊艳。
3.  **克制与极简 (Minimalist)**：不喜欢冗余代码和文件。如果一个功能可以用 CSS 优雅解决，就绝不动用复杂的 JS 库（如删除 `covers.ts` 的决策）。
4.  **产品化思维 (Product-Minded)**：关注部署体验、SEO、PWA 等生产环境细节，不仅仅是写代码，更是在打造一个完整的闭环产品。

---

## 5. 💡 避坑小贴士
*   **VitePWA 构建失败**：如果遇到 WASM 或大文件构建报错，记得检查 `maximumFileSizeToCacheInBytes` 配置。
*   **路径 404**：在 GitHub Pages 等静态托管平台上，一定要配置 `404.html` 兜底，并让 Service Worker 接管导航请求，否则 SPA 路由刷新必死。
