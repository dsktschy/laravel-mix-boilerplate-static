const mix = require('laravel-mix')
const Log = require('laravel-mix/src/Log')
const fs = require('fs-extra')
const path = require('path')
const imagemin = require('imagemin')
const imageminMozjpeg = require('imagemin-mozjpeg')
const imageminPngquant = require('imagemin-pngquant')
const imageminGifsicle = require('imagemin-gifsicle')
const globby = require('globby')
require('laravel-mix-copy-watched')
mix.pug = require('laravel-mix-pug')

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
      // Variables
      locals: {
        paragraph: 'foobar',
        // Function for cache busting
        mix: (filePath = '') => filePath + '?v=' + Date.now()
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
  // It's difficult handle public/mix-manifest.json from static pages
  // .version()

// Only in production mode
if (process.env.NODE_ENV === "production") {
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
    files: [
      'public/assets/**/*',
      'public/**/*.html'
    ]
  })
}

// Full API
// mix.js(src, output);
// mix.react(src, output); <-- Identical to mix.js(), but registers React Babel compilation.
// mix.preact(src, output); <-- Identical to mix.js(), but registers Preact compilation.
// mix.coffee(src, output); <-- Identical to mix.js(), but registers CoffeeScript compilation.
// mix.ts(src, output); <-- TypeScript support. Requires tsconfig.json to exist in the same folder as webpack.mix.js
// mix.extract(vendorLibs);
// mix.sass(src, output);
// mix.less(src, output);
// mix.stylus(src, output);
// mix.postCss(src, output, [require('postcss-some-plugin')()]);
// mix.browserSync('my-site.test');
// mix.combine(files, destination);
// mix.babel(files, destination); <-- Identical to mix.combine(), but also includes Babel compilation.
// mix.copy(from, to);
// mix.copyDirectory(fromDir, toDir);
// mix.minify(file);
// mix.sourceMaps(); // Enable sourcemaps
// mix.version(); // Enable versioning.
// mix.disableNotifications();
// mix.setPublicPath('path/to/public');
// mix.setResourceRoot('prefix/for/resource/locators');
// mix.autoload({}); <-- Will be passed to Webpack's ProvidePlugin.
// mix.webpackConfig({}); <-- Override webpack.config.js, without editing the file directly.
// mix.babelConfig({}); <-- Merge extra Babel configuration (plugins, etc.) with Mix's default.
// mix.then(function () {}) <-- Will be triggered each time Webpack finishes building.
// mix.extend(name, handler) <-- Extend Mix's API with your own components.
// mix.options({
//   extractVueStyles: false, // Extract .vue component styling to file, rather than inline.
//   globalVueStyles: file, // Variables file to be imported in every component.
//   processCssUrls: true, // Process/optimize relative stylesheet url()'s. Set to false, if you don't want them touched.
//   purifyCss: false, // Remove unused CSS selectors.
//   terser: {}, // Terser-specific options. https://github.com/webpack-contrib/terser-webpack-plugin#options
//   postCss: [] // Post-CSS options: https://github.com/postcss/postcss/blob/master/docs/plugins.md
// });
