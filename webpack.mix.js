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

const srcRelativePath =
  (process.env.MIX_SRC_RELATIVE_PATH || 'resources')
    .replace(/\/$/, '')
const distRelativePath =
  (process.env.MIX_DIST_RELATIVE_PATH || 'public')
    .replace(/\/$/, '')

// Clean public directory
fs.removeSync(distRelativePath)

mix
  // Set output directory of mix-manifest.json
  .setPublicPath(distRelativePath)
  .polyfill()
  .js(
    `${srcRelativePath}/assets/js/app.js`,
    `${distRelativePath}/assets/js`
  )
  .eslint()
  .sass(
    `${srcRelativePath}/assets/css/app.scss`,
    `${distRelativePath}/assets/css`
  )
  .stylelint()
  .options({ processCssUrls: false })
  .webpackConfig({
    plugins: [
      new SVGSpritemapPlugin(
        // Subdirectories (sprite/**/*.svg) are not allowed
        // Because same ID attribute is output multiple times,
        // if file names are duplicated among multiple directories
        `${srcRelativePath}/assets/svg/sprite/*.svg`,
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
      `${srcRelativePath}/assets/svg/!(sprite)`,
      `${srcRelativePath}/assets/svg/!(sprite)/**/*`
    ],
    `${distRelativePath}/assets/svg`,
    { base: `${srcRelativePath}/assets/svg` }
  )
  .browserSync({
    open: false,
    host: process.env.MIX_BROWSER_SYNC_HOST || 'localhost',
    port: process.env.MIX_BROWSER_SYNC_PORT || 3000,
    proxy: false,
    server: distRelativePath,
    // If this setting is `${distRelativePath}/**/*`,
    // injection of changes such as CSS will be not available
    // https://github.com/JeffreyWay/laravel-mix/issues/1053
    files: [
      `${distRelativePath}/assets/**/*`,
      `${distRelativePath}/**/*.html`
    ],
    https:
      process.env.MIX_BROWSER_SYNC_HTTPS_CERT &&
      process.env.MIX_BROWSER_SYNC_HTTPS_KEY
        ? {
          cert: process.env.MIX_BROWSER_SYNC_HTTPS_CERT,
          key: process.env.MIX_BROWSER_SYNC_HTTPS_KEY
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
    `${srcRelativePath}/views/**/[!_]*.pug`,
    distRelativePath,
    {
      // Path to directory that contains JSON or YAML
      seeds: srcRelativePath,
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
      excludePath: `${srcRelativePath}/views`,
      // Options for Pug
      pug: {
        // Required to include partials with root relative path
        basedir: `${srcRelativePath}/views`
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
      { context: srcRelativePath },
      // Options for optimization
      {
        // To find targets exactly, requires test option that is function
        test: filePath => !!multimatch(filePath, [ 'assets/images/**/*' ]).length,
        pngquant: { strip: true, quality: 100-100 }, // 0 ~ 100
        gifsicle: { optimizationLevel: 1 }, // 1 ~ 3
        plugins: [ require('imagemin-mozjpeg')({ quality: 100 }) ] // 0 ~ 100
      }
    )
    // Delete unnecesary files
    .then(() => {
      fs.removeSync(`${distRelativePath}/assets/js/.svg-dummy-module.js`)
      fs.removeSync(`${distRelativePath}/mix-manifest.json`)
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
      `${srcRelativePath}/assets/images`,
      `${distRelativePath}/assets/images`,
      { base: `${srcRelativePath}/assets/images` }
    )
}
