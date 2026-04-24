import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/bookhub/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'logo.svg'],
        manifest: {
          name: 'BookHub - 极简阅读',
          short_name: 'BookHub',
          description: '基于 GitHub 的私人墨香书阁',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'favicon.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'favicon.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        },
        workbox: {
          // 这里的配置解决 404 路由问题
          navigateFallback: '/bookhub/index.html',
          // 解决 WASM 文件过大导致构建失败的问题 (默认 2MB -> 10MB)
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          // 排除敏感信息请求缓存
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.github\.com\/.*$/,
              handler: 'NetworkOnly', // 永远不要缓存 GitHub API 请求，保护 Token 安全
            },
            {
              urlPattern: /^https:\/\/raw\.githubusercontent\.com\/.*$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'github-raw-content',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                }
              }
            }
          ]
        }
      })
    ],
    build: {
      rollupOptions: {
        output: {
          // 代码拆分优化，解决 Chunk 大小警告
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-pdf': ['pdfjs-dist'],
            'vendor-epub': ['epubjs'],
            'vendor-ui': ['lucide-react', 'motion/react', 'clsx', 'tailwind-merge'],
          }
        }
      },
      chunkSizeWarningLimit: 1000, // 提高报警阈值到 1MB
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
