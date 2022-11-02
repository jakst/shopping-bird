import solid from 'solid-start/vite'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [solid(), Icons({ compiler: 'solid' })],
})
