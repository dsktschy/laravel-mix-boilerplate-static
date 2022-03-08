// https://github.com/okonet/lint-staged#eslint--7-1

import { ESLint } from 'eslint'
import filterAsync from 'node-filter-async'

const eslintCli = new ESLint()

const removeIgnoredFiles = async files => {
  const filteredFiles = await filterAsync(files, async file => {
    const isIgnored = await eslintCli.isPathIgnored(file)
    return !isIgnored
  })
  return filteredFiles.join(' ')
}

export default {
  '**/*.{js,jsx,mjs,cjs}': async files => {
    const filesToLint = await removeIgnoredFiles(files)
    return [
      `eslint --cache --max-warnings=0 ${filesToLint}`,
      `prettier -w ${files.join(' ')}`
    ]
  },
  '**/*.{scss,css}': files => [
    `stylelint ${files.join(' ')}`,
    `prettier -w ${files.join(' ')}`
  ],
  '*.md': ['prettier --write']
}
