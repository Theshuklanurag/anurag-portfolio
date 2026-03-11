import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Change base to '/' if deploying to Vercel/Netlify
// Change base to '/your-repo-name/' if deploying to GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: '/',
})