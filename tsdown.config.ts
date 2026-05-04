import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core/index.ts',
    streaming: 'src/adapters/streaming/index.ts',
    feed: 'src/adapters/feed/index.ts',
    playlist: 'src/adapters/playlist/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  publint: true,
  external: ['react', 'react-dom', 'lucide-react'],
})
