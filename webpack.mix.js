const mix = require('laravel-mix')
const Log = require('laravel-mix/src/Log')
const fs = require('fs-extra')
const path = require('path')
const imagemin = require('imagemin')
const imageminMozjpeg = require('imagemin-mozjpeg')
const imageminPngquant = require('imagemin-pngquant')
const imageminGifsicle = require('imagemin-gifsicle')
const globby = require('globby')
const SVGSpritemapPlugin = require('svg-spritemap-webpack-plugin')
require('laravel-mix-polyfill')
require('laravel-mix-copy-watched')
require('laravel-mix-eslint')
require('laravel-mix-stylelint')
mix.pug = require('laravel-mix-pug')

const svgDummyModuleName = 'assets/js/.svg-dummy-module'
const resourcesDirName = 'resources'
const publicDirName = 'public'

// Clean public directory
fs.removeSync(publicDirName)

mix
  // Set output directory of mix-manifest.json
  .setPublicPath(publicDirName)
  // It's difficult handle public/mix-manifest.json from static pages
  // Can use function of Pug instead of PHP, to set parameter for cache busting
  // .version()
  .polyfill({ corejs: 3 })
  .js(
    `${resourcesDirName}/assets/js/app.js`,
    `${publicDirName}/assets/js`
  )
  .eslint()
  .sass(
    `${resourcesDirName}/assets/css/app.scss`,
    `${publicDirName}/assets/css`
  )
  .stylelint()
  .copyWatched(
    `${resourcesDirName}/assets/images`,
    `${publicDirName}/assets/images`,
    { base: `${resourcesDirName}/assets/images` }
  )
  .pug(
    `${resourcesDirName}/views/**/[!_]*.pug`,
    publicDirName,
    {
      // Path to directory that contains JSON or YAML
      seeds: resourcesDirName,
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
      excludePath: `${resourcesDirName}/views`,
      // Options for Pug
      pug: {
        // Required to include partials with root relative path
        basedir: `${resourcesDirName}/views`
      }
    }
  )
  .webpackConfig({
    plugins: [
      new SVGSpritemapPlugin(
        // Subdirectories (svg/**/*.svg) are not allowed
        // Because same ID attribute is output multiple times,
        // if file names are duplicated among multiple directories
        `${resourcesDirName}/assets/svg/sprite/*.svg`,
        {
          output: {
            filename: 'assets/svg/sprite.svg',
            // In development, keep chunk file without deletion
            // Because error occurs if chunk file has deleted when creating mix-manifest.json
            chunk: {
              name: svgDummyModuleName,
              keep: true
            },
            svgo: {
              plugins: [
                { removeTitle: true },
                { cleanupIDs: true },
                { removeAttrs: { attrs: '(fill|stroke|data.*)' } },
                { addClassesToSVGElement: { className: 'svg-sprite' } }
              ]
            },
            svg4everybody: true
          }
        }
      )
    ]
  })

// Only in production mode
if (process.env.NODE_ENV === 'production') {
  mix.then(async () => {
    // Execute imagemin for each file in loop
    // Because imagemin can't keep hierarchical structure
    const targets = globby.sync(
      `${publicDirName}/assets/images/**/*.{jpg,jpeg,png,gif}`,
      { onlyFiles: true }
    )
    for (let target of targets) {
      Log.feedback(`Optimizing ${target}`)
      await imagemin([ target ], path.dirname(target), {
        plugins: [
          imageminMozjpeg({ quality: 100 }), // 0 ~ 100
          imageminPngquant({ quality: [ 1, 1 ] }), // 0 ~ 1
          imageminGifsicle({ optimizationLevel: 3 }) // 1 ~ 3
        ]
      }).catch(error => { throw error })
    }
    // In production, delete unnecesary files
    fs.removeSync(`${publicDirName}/${svgDummyModuleName}.js`)
    fs.removeSync(`${publicDirName}/mix-manifest.json`)
  })
}

// Only in development mode
else {
  // Reloading is necessary to see the change of the SVG file
  // But BrowserSync execute ingection for SVG changes
  // Options of BrowserSync can not change this behavior
  // https://github.com/BrowserSync/browser-sync/issues/1287
  const options = {
    open: false,
    host: process.env.BROWSER_SYNC_HOST || 'localhost',
    port: process.env.BROWSER_SYNC_PORT || 3000,
    server: publicDirName,
    proxy: false,
    // If this setting is 'wp-content/public/**/*',
    // injection of changes such as CSS will be not available
    // https://github.com/JeffreyWay/laravel-mix/issues/1053
    files: [
      `${publicDirName}/assets/**/*`,
      `${publicDirName}/**/*.html`
    ]
  }
  const cert = process.env.BROWSER_SYNC_HTTPS_CERT
  const key = process.env.BROWSER_SYNC_HTTPS_KEY
  if (cert && key) {
    options.https = { cert, key }
  }
  mix.browserSync(options)
}
