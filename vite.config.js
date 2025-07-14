import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // 优化开发服务器性能
  server: {
    // 增加 HMR 超时时间
    hmr: {
      timeout: 5000,
    },
    // 放宽文件系统限制
    fs: {
      strict: false,
    },
    // 配置后端API代理，避免跨域并简化前端请求
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/results": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
    // 热更新优化
    watch: {
      usePolling: false, // 如在Docker或WSL中使用，可能需要设为true
    },
  },

  // 优化依赖预构建
  optimizeDeps: {
    // 只预构建频繁变化的依赖
    include: ["react", "react-dom", "react-router-dom"],
    // 减少大型库的预构建时间
    exclude: [],
  },

  // 构建优化
  build: {
    // 更快的构建，不生成source map
    sourcemap: false,
    // 减少大型依赖的捆绑
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },

  // 减少不必要的控制台输出
  logLevel: "info",
});
