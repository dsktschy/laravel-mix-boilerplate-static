const fs = require('fs-extra')
const mix = require('laravel-mix')
require('laravel-mix-polyfill')
require('laravel-mix-ejs')
require('laravel-mix-copy-watched')
const SVGSpritemapPlugin = require('svg-spritemap-webpack-plugin')
const bsConfig = require('./bs-config.js')
const svgoConfig = require('./svgo.config.js')

const srcRelativePath = process.env.MIX_SRC_RELATIVE_PATH
const publicRelativePath = process.env.MIX_PUBLIC_RELATIVE_PATH
const distRelativePath = process.env.MIX_DIST_RELATIVE_PATH

const legacyMode = process.env.MIX_LEGACY_MODE?.toLowerCase() === 'on'
const browserslistConfig = [
  'defaults',
  'iOS >= 9',
  legacyMode ? 'ie 11' : 'not ie 11'
]

const detailedSourceMapMode =
  process.env.MIX_DETAILED_SOURCE_MAP_MODE?.toLowerCase() === 'on'

mix
  .setPublicPath(distRelativePath)
  .version()
  .js(
    `${srcRelativePath}/assets/scripts/index.js`,
    `${distRelativePath}/assets/scripts`
  )
  .polyfill({
    targets: browserslistConfig.join(',')
  })
  .sass(
    `${srcRelativePath}/assets/styles/index.scss`,
    `${distRelativePath}/assets/styles`
  )
  .options({
    autoprefixer: {
      overrideBrowserslist: browserslistConfig
    },
    processCssUrls: false,
    manifest: false
  })
  .sourceMaps(
    false,
    detailedSourceMapMode ? 'inline-cheap-module-source-map' : 'eval'
  )
  .ejs(
    [`${srcRelativePath}/templates`, `${distRelativePath}/assets/sprites`],
    distRelativePath,
    {},
    {
      root: `${srcRelativePath}/templates`,
      base: `${srcRelativePath}/templates`,
      partials: [
        `${srcRelativePath}/templates/partials`,
        `${distRelativePath}/assets/sprites`
      ]
    }
  )
  .copyWatched(
    `${srcRelativePath}/assets/images`,
    `${distRelativePath}/assets/images`,
    { base: `${srcRelativePath}/assets/images` }
  )
  .copyWatched(publicRelativePath, distRelativePath, {
    base: publicRelativePath
  })
  .webpackConfig({
    plugins: [
      new SVGSpritemapPlugin(
        `${srcRelativePath}/assets/sprites/index/*.svg`, // *2
        {
          output: {
            svgo: svgoConfig,
            svg4everybody: legacyMode,
            filename: 'assets/sprites/index.svg',
            chunk: {
              name: '.svg-dummy-module',
              keep: true
            }
          }
        }
      )
    ]
  })
  .browserSync(bsConfig)
  .before(() => {
    fs.removeSync(distRelativePath)
  })
  .after(() => {
    if (mix.inProduction()) {
      fs.removeSync(`${distRelativePath}/assets/scripts/.svg-dummy-module.js`)
    }
  })
