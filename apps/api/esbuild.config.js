const { esbuildDecorators } = require('@anatine/esbuild-decorators');
const path = require('path');

module.exports = {
  outExtension: { '.js': '.js' },
  plugins: [
    esbuildDecorators({
      tsconfig: path.resolve(__dirname, 'tsconfig.app.json'),
      cwd: __dirname,
    }),
  ],
};
