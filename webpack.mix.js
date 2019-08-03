const mix = require('laravel-mix')
const fs = require('fs-extra')
const multimatch = require('multimatch')
const SVGSpritemapPlugin = require('svg-spritemap-webpack-plugin')
require('laravel-mix-polyfill')
require('laravel-mix-copy-watched')
require('laravel-mix-eslint')
require('laravel-mix-stylelint')
require('laravel-mix-imagemin')
require('laravel-mix-ejs')

const srcRelativePath =
  (process.env.MIX_SRC_RELATIVE_PATH || 'resources')
    .replace(/\/$/, '')
const distRelativePath =
  (process.env.MIX_DIST_RELATIVE_PATH || 'public')
    .replace(/\/$/, '')
const basePath =
  (process.env.MIX_BASE_PATH || '')
    .replace(/\/$/, '')

fs.removeSync(distRelativePath)

mix
  .setPublicPath(distRelativePath) // *1
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
        `${srcRelativePath}/assets/svg/sprite/*.svg`, // *2
        {
          output: {
            filename: 'assets/svg/sprite.svg',
            chunk: {
              name: 'assets/js/.svg-dummy-module',
              keep: true // *3
            },
            svgo: {
              plugins: [
                { addClassesToSVGElement: { className: 'svg-sprite' } }
              ]
            },
            svg4everybody: true
          }
        }
      )
    ]
  })
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
    files: [ // *4
      `${distRelativePath}/assets/**/*`,
      `${distRelativePath}/**/*.html`,
      `${distRelativePath}/**/*.php`
    ],
    https:
      process.env.MIX_BROWSER_SYNC_HTTPS_CERT &&
      process.env.MIX_BROWSER_SYNC_HTTPS_KEY
        ? {
          cert: process.env.MIX_BROWSER_SYNC_HTTPS_CERT,
          key: process.env.MIX_BROWSER_SYNC_HTTPS_KEY
        }
        : false
  })
  .sourceMaps(false, 'inline-cheap-module-source-map') // *5
  .ejs(
    `${srcRelativePath}/views`,
    distRelativePath,
    {
      mix: (filePath = '') => // *6
        process.env.NODE_ENV === 'production'
          ? basePath + filePath + '?id=' + Date.now()
          : basePath + filePath,
      svgSprite: (filePath = '', id = '') => // *7
        process.env.NODE_ENV === 'production'
          ? id
          : basePath + filePath + id
    },
    {
      outputFunctionName: 'echo',
      root: `${srcRelativePath}/views`,
      base: `${srcRelativePath}/views`,
      partials: `${srcRelativePath}/views/partials`
    }
  )

if (process.env.NODE_ENV === 'production') {
  mix
    .imagemin(
      [ 'assets/images/**/*' ],
      { context: srcRelativePath },
      {
        test: filePath => !!multimatch(filePath, [ 'assets/images/**/*' ]).length, // *8
        pngquant: { strip: true, quality: 100-100 }, // 0 ~ 100
        gifsicle: { optimizationLevel: 1 }, // 1 ~ 3
        plugins: [ require('imagemin-mozjpeg')({ quality: 100 }) ] // 0 ~ 100
      }
    )
    .then(() => { // *9
      fs.removeSync(`${distRelativePath}/assets/js/.svg-dummy-module.js`)
      fs.removeSync(`${distRelativePath}/mix-manifest.json`)
    })
}

else {
  mix
    .copyWatched( // *10
      `${srcRelativePath}/assets/images`,
      `${distRelativePath}/assets/images`,
      { base: `${srcRelativePath}/assets/images` }
    )
}

/*

*1
This method determines output directories for followings
`mix-manifest.json`, webpackConfig, imagemin

*2
Following setting must not be set
`${srcRelativePath}/assets/svg/sprite/** /*.svg`
Because, file name determines id attribute, so all target file names must be unique

*3
Keep chunk file without deletion
Because error occurs if chunk file has deleted when creating `mix-manifest.json`

*4
Following setting must not be set
`${distRelativePath}/** /*`
Because injection of changes such as CSS will be not available
https://github.com/JeffreyWay/laravel-mix/issues/1053

*5
Note that several types don't output map for CSS
https://webpack.js.org/configuration/devtool/#devtool

*6
This function mimics mix() of Laravel Mix

*7
This function creates path for SVG sprite
In production, sprite is embed as inline code, and referenced with id without request
In development, sprite is not embed, but requested with filepath argument as another file
If embed in development, EJS recompilation and browser reloading are caused by SVGSpritemapPlugin, no matter what changes

*8
`test` option is required
Because imagemin can not find targets exactly without this function

*9
Remove unnecesary files after all processings

*10
In development, copyWatched method is used instead of imagemin
Because it is unnecessary to optimize images

*/
