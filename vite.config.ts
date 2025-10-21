import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/ui': path.resolve(__dirname, './src/components/ui'),
      '@/features': path.resolve(__dirname, './src/components/features'),
      '@/modals': path.resolve(__dirname, './src/components/modals'),
      '@/layout': path.resolve(__dirname, './src/components/layout'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/constants': path.resolve(__dirname, './src/constants'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/workers': path.resolve(__dirname, './src/workers'),
      '@/data': path.resolve(__dirname, './src/data'),
    },
  },
  worker: {
    format: 'es', // Use ES modules in workers
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
