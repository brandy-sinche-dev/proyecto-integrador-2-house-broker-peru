const importMetaEnv = () => ({
  visitor: {
    MetaProperty(path) {
      const { node } = path
      if (node.meta?.name === 'import' && node.property?.name === 'meta') {
        path.replaceWithSourceString(
          `({ env: { VITE_API_URL: ${JSON.stringify(process.env.VITE_API_URL)} } })`,
        )
      }
    },
  },
})

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  plugins: [importMetaEnv],
}