module.exports = {
  srcDir: __dirname,
  name: 'bm',
  port: 3126,
  scope: 'bm',
  exposes: {
    './routes': './src/routes.tsx',
  },
  routes: {
    url: 'http://localhost:3126/remoteEntry.js',
    scope: 'bm',
    module: './routes',
  },
  menus: [
    { text: 'Tms', url: '/tms', icon: 'icon-star', location: 'mainNavigation' },
  ],
};
