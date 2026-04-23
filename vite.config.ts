import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repositoryName = 'planet-factory-three'

// https://vite.dev/config/
export default defineConfig({
  base: `/${repositoryName}/`,
  plugins: [react()],
})
