const mix = require('laravel-mix')
const fs = require('fs-extra')
const multimatch = require('multimatch')
const SVGSpritemapPlugin = require('svg-spritemap-webpack-plugin')
require('laravel-mix-polyfill')
require('laravel-mix-copy-watched')
require('laravel-mix-eslint')
require('laravel-mix-stylelint')
require('laravel-mix-imagemin')
mix.pug = require('@dsktschy/laravel-mix-pug')

const srcDirName = 'resources'
const distDirName = 'public'

// Clean public directory
fs.removeSync(distDirName)

mix
  // Set output directory of mix-manifest.json
  .setPublicPath(distDirName)
  .polyfill()
  .js(
    `${srcDirName}/assets/js/app.js`,
    `${distDirName}/assets/js`
  )
  .eslint()
  .sass(
    `${srcDirName}/assets/css/app.scss`,
    `${distDirName}/assets/css`
  )
  .stylelint()
  .webpackConfig({
    plugins: [
      new SVGSpritemapPlugin(
        // Subdirectories (sprite/**/*.svg) are not allowed
        // Because same ID attribute is output multiple times,
        // if file names are duplicated among multiple directories
        `${srcDirName}/assets/svg/sprite/*.svg`,
        {
          output: {
            filename: 'assets/svg/sprite.svg',
            // Keep chunk file without deletion
            // Because error occurs if chunk file has deleted when creating mix-manifest.json
            chunk: {
              name: 'assets/js/.svg-dummy-module',
              keep: true
            },
            svgo: {
              plugins: [
                // Required to hide sprite
                { addClassesToSVGElement: { className: 'svg-sprite' } }
              ]
            },
            svg4everybody: true
          }
        }
      )
    ]
  })
  // Copy SVG that is not sprite
  .copyWatched(
    [
      `${srcDirName}/assets/svg/!(sprite)`,
      `${srcDirName}/assets/svg/!(sprite)/**/*`
    ],
    `${distDirName}/assets/svg`,
    { base: `${srcDirName}/assets/svg` }
  )
  .browserSync({
    open: false,
    host: process.env.BROWSER_SYNC_HOST || 'localhost',
    port: process.env.BROWSER_SYNC_PORT || 3000,
    proxy: false,
    server: distDirName,
    // If this setting is `${distDirName}/**/*`,
    // injection of changes such as CSS will be not available
    // https://github.com/JeffreyWay/laravel-mix/issues/1053
    files: [
      `${distDirName}/assets/**/*`,
      `${distDirName}/**/*.html`
    ],
    https:
      process.env.BROWSER_SYNC_HTTPS_CERT &&
      process.env.BROWSER_SYNC_HTTPS_KEY
        ? {
          cert: process.env.BROWSER_SYNC_HTTPS_CERT,
          key: process.env.BROWSER_SYNC_HTTPS_KEY
        }
        : false
    // Reloading is necessary to see the change of the SVG file
    // But BrowserSync execute ingection for SVG changes
    // Options of BrowserSync can not change this behavior
    // https://github.com/BrowserSync/browser-sync/issues/1287
  })
  // First argument whether source map is output in production
  // Second argument is source map type. Note that several types don't output map for CSS
  // https://webpack.js.org/configuration/devtool/#devtool
  .sourceMaps(false, 'inline-cheap-module-source-map')
  .pug(
    `${srcDirName}/views/**/[!_]*.pug`,
    distDirName,
    {
      // Path to directory that contains JSON or YAML
      seeds: srcDirName,
      // Variables and functions
      locals: {
        // Function for cache busting
        mix: (filePath = '') => filePath + '?id=' + Date.now(),
        // Function to create path for SVG sprite, according to NODE_ENV
        // Requires path to sprite SVG file and ID
        // In development, if SVG is included in pug,
        // injection of changes such as CSS by BrowserSync is prevented
        // Because svg-spritemap-webpack-plugin reacts for all changes,
        // and it causes pug recompile and browser reloading
        svgSprite: (filePath = '', id = '') =>
          process.env.NODE_ENV === 'production' ? id : filePath + id
      },
      // Base directory
      excludePath: `${srcDirName}/views`,
      // Options for Pug
      pug: {
        // Required to include partials with root relative path
        basedir: `${srcDirName}/views`
      }
    }
  )

// Only in production mode
if (process.env.NODE_ENV === 'production') {
  mix
    // Copy and optimize images in production
    .imagemin(
      // Options for copying
      [ 'assets/images/**/*' ],
      { context: srcDirName },
      // Options for optimization
      {
        // To find targets exactly, requires test option that is function
        test: filePath => !!multimatch(filePath, [ 'assets/images/**/*' ]).length,
        optipng: { optimizationLevel: 0 }, // 0 ~ 7
        gifsicle: { optimizationLevel: 1 }, // 1 ~ 3
        plugins: [ require('imagemin-mozjpeg')({ quality: 100 }) ] // 0 ~ 100
      }
    )
    // Delete unnecesary files
    .then(() => {
      fs.removeSync(`${distDirName}/assets/js/.svg-dummy-module.js`)
      fs.removeSync(`${distDirName}/mix-manifest.json`)
    })
    // It's difficult handle public/mix-manifest.json from static pages
    // Can use function of Pug instead of PHP, to set parameter for cache busting
    // .version()
}

// Only in development mode
else {
  mix
    // Copy images without optimization in development
    .copyWatched(
      `${srcDirName}/assets/images`,
      `${distDirName}/assets/images`,
      { base: `${srcDirName}/assets/images` }
    )
}
