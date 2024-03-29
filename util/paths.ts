import fs from 'fs'
import path from 'path'

export function getProjectRoot () {
  let dir = path.resolve(__dirname)
  while (dir !== '/') {
    if (fs.existsSync(path.resolve(dir, 'tsconfig.json'))) {
      return dir
    }
    dir = path.resolve(dir, '..')
  }

  throw new Error(`Failed to find project root, missing tsconfig.json in parent of: ${__dirname}!`)
}
