#!/usr/bin/env node

require('dotenv').config()
const { rm, rename } = require('fs/promises')
const sharp = require('sharp')
const fastGlob = require('fast-glob')
const options = require('../sharp.config')

// Compress PNG
const pngGlob = `${process.env.MIX_DIST_RELATIVE_PATH}/assets/images/**/*.png`
for (let pngPath of fastGlob.sync(pngGlob, { caseSensitiveMatch: false })) {
  const tempPath = pngPath.replace(/\.png$/i, '.compressed.png')
  sharp(pngPath)
    .png(options.png)
    .toFile(tempPath)
    .then(async () => {
      await rm(pngPath)
      await rename(tempPath, pngPath)
    })
}

// Compress JPEG
const jpegGlob = `${process.env.MIX_DIST_RELATIVE_PATH}/assets/images/**/*.{jpg,jpeg}`
for (let jpegPath of fastGlob.sync(jpegGlob, { caseSensitiveMatch: false })) {
  const tempPath = jpegPath
    .replace(/\.jpg$/i, '.compressed.jpg')
    .replace(/\.jpeg$/i, '.compressed.jpeg')
  sharp(jpegPath)
    .jpeg(options.jpeg)
    .toFile(tempPath)
    .then(async () => {
      await rm(jpegPath)
      await rename(tempPath, jpegPath)
    })
}
