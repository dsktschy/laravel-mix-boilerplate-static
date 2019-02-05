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
require('laravel-mix-copy-watched')
mix.pug = require('laravel-mix-pug')

const svgDummyModuleName = 'assets/js/.svg-dummy-module'

// Clean public directory
fs.removeSync('public/')
mix
  // Set output directory of mix-manifest.json
  .setPublicPath('public')
  .js(
    'resources/assets/js/app.js',
    'public/assets/js'
  )
  .sass(
    'resources/assets/css/app.scss',
    'public/assets/css'
  )
  .copyWatched(
    'resources/assets/images/**/*.{jpg,jpeg,png,gif}',
    'public/assets/images',
    { base: 'resources/assets/images' }
  )
  .pug(
    'resources/views/**/[!_]*.pug',
    'public',
    {
      // Path to directory that contains JSON or YAML
      seeds: 'resources',
      // Variables and functions
      locals: {
        // Function for cache busting
        mix: (filePath = '') => filePath + '?v=' + Date.now(),
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
      excludePath: 'resources/views',
      // Options for Pug
      pug: {
        // Required to include partials with root relative path
        basedir: 'resources/views'
      }
    }
  )
  .webpackConfig({
    // Prettier Loader has problem that it cause file saving one more time
    // Therefore following loaders are triggered twice
    // If this problem is not allowed,
    // you can turn off Prettier Loader by removing the following two module.rules
    // Details here: https://github.com/iamolegga/prettier-loader/issues/1
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          loader: 'prettier-loader',
          exclude: /node_modules/,
          options: { parser: 'babel' }
        },
        {
          test: /\.(scss|css)?$/,
          loader: 'prettier-loader',
          exclude: /node_modules/,
          options: { parser: 'scss' }
        }
      ]
    },
    plugins: [
      new SVGSpritemapPlugin(
        // Subdirectories (svg/**/*.svg) are not allowed
        // Because same ID attribute is output multiple times,
        // if file names are duplicated among multiple directories
        'resources/assets/svg/sprite/*.svg',
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
  // It's difficult handle public/mix-manifest.json from static pages
  // .version()

// Only in production mode
if (process.env.NODE_ENV === 'production') {
  mix.then(async () => {
    // Execute imagemin for each file in loop
    // Because imagemin can't keep hierarchical structure
    const targets = globby.sync(
      'public/assets/images/**/*.{jpg,jpeg,png,gif}',
      { onlyFiles: true }
    )
    for (let target of targets) {
      Log.feedback(`Optimizing ${target}`)
      await imagemin([ target ], path.dirname(target), {
        plugins: [
          imageminMozjpeg({ quality: 80 }),
          imageminPngquant({ quality: [ 0.65, 0.8 ] }),
          imageminGifsicle()
        ]
      }).catch(error => { throw error })
    }
    // In production, delete chunk file for SVG sprite
    fs.removeSync(`public/${svgDummyModuleName}.js`)
    const pathToManifest = 'public/mix-manifest.json'
    const manifest = require(`./${pathToManifest}`)
    delete manifest[`/${svgDummyModuleName}.js`]
    fs.writeFileSync(path.resolve(pathToManifest), JSON.stringify(manifest), 'utf-8')
  })
}

// Only in development mode
else {
  mix.browserSync({
    open: false,
    server: 'public',
    proxy: false,
    // If setting: 'wp-content/public/**/*',
    // injection of changes such as CSS will be not available
    // https://github.com/JeffreyWay/laravel-mix/issues/1053
    // Prettier Loader has problem that it cause file saving one more time
    // Therefore reload / injection are triggered twice
    // Options of BrowserSync (e.g. reloadDebounce) can not prevent this
    // If this problem is not allowed, you can turn off Prettier Loader
    // by removing two module.rules in argument of webpackConfig method
    // https://github.com/iamolegga/prettier-loader/issues/1
    files: [
      'public/assets/**/*',
      'public/**/*.html'
    ]
  })
}
