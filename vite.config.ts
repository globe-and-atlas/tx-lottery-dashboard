import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        base: resolve(__dirname, 'index-base.html'),
        mass: resolve(__dirname, 'index-mass.html'),
        sports: resolve(__dirname, 'index-sports.html'),
        alt: resolve(__dirname, 'index-alt.html'),
        neo: resolve(__dirname, 'index-neo.html'),
        lux: resolve(__dirname, 'index-lux.html'),
        tac: resolve(__dirname, 'index-tac.html'),
        alpha: resolve(__dirname, 'index-alpha.html'),
        bit: resolve(__dirname, 'index-bit.html'),
        genz: resolve(__dirname, 'index-genz.html'),
        mom: resolve(__dirname, 'index-mom.html'),
        mystic: resolve(__dirname, 'index-mystic.html'),
        vegas: resolve(__dirname, 'index-vegas.html'),
        gibson: resolve(__dirname, 'index-gibson.html'),
      },
    },
  },
})
