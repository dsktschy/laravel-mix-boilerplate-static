#!/usr/bin/env node

require('dotenv').config()
const sharp = require('sharp')
const fastGlob = require('fast-glob')

// Convert PNG and JPEG to WebP
const glob = `${process.env.MIX_DIST_RELATIVE_PATH}/assets/images/**/*.{png,jpg,jpeg}`
for (let path of fastGlob.sync(glob, { caseSensitiveMatch: false })) {
  const outputPath = path.replace(/\.(png|jpg|jpeg)$/i, '.webp')
  sharp(path).toFormat('webp', { quality: 100 }).toFile(outputPath)
}
