const path = require("path");
const cssnano = require('cssnano');
const autoprefixer = require('autoprefixer');
const terser = require('rollup-plugin-terser').terser;
const postcss = require('rollup-plugin-postcss');
const image = require('@rollup/plugin-image');
const json = require('@rollup/plugin-json');
const commonjs = require('@rollup/plugin-commonjs');
const alias = require('@rollup/plugin-alias');
const resolve = require('@rollup/plugin-node-resolve').nodeResolve;
const strip = require("@rollup/plugin-strip");
// const copy = require('rollup-plugin-copy');

const pkg = require("./package.json");

// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
const production = !process.env.ROLLUP_WATCH;

// Not transpiled with TypeScript or Babel, so use plain Es6/Node.js!
module.exports = {
  // path to file
  input: './src/index.ts',
  // Name of package
  name: pkg.name,
  // JS target
  target: 'node', //'node' | 'browser',
  // Module format
  format: 'cjs',//'cjs' | 'umd' | 'esm' | 'system',
  // Environment
  // env: 'development' | 'production',
  // Path to tsconfig file
  tsconfig: './tsconfig.json',
  // Is error extraction running?
  extractErrors: true,
  // Is minifying?
  minify: false,
  // Is this the very first rollup config (and thus should one-off metadata be extracted)?
  writeMeta: true,
  // Only transpile, do not type check (makes compilation faster)
  transpileOnly: false,
  // 
  rollup(config, options) {
    config.plugins.push(
      resolve(),
      commonjs(
        { include: /node_modules/ }
      ),
      json({
        kml: true
      }),
      postcss({
        plugins: [
          autoprefixer(),
          cssnano({
            preset: 'default',
          }),
        ],
        extract: !!options.writeMeta,
        // modules: true, // 使用css modules
        camelCase: true, // 支持驼峰
        sass: false, // 是否使用sass
        less: true, // 是否使用less
      }),
      image({
        svg: true
      }),
      alias({
        resolve: [".ts", ".js"],  // 可选，默认情况下这只会查找 .js 文件或文件夹
        entries: {
          "@": path.resolve(__dirname, 'src')
        },
      }),
      strip(),
      production && terser(),
      // copy({
      //   targets: [
      //     { src: 'dist', dest: 'dist1' },
      //   ],
      //   verbose: true
      // })
    );
    return config; // always return a config.
  },
};