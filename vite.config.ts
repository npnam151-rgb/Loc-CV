import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load toàn bộ biến môi trường (bao gồm cả biến hệ thống Vercel)
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // QUAN TRỌNG: Chỉ define cụ thể biến cần dùng. 
      // KHÔNG define cả object 'process.env' vì sẽ gây crash build trên Vercel.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})