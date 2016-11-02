/**
* @license MIT
* @author aAXEe (https://github.com/aAXEe)
*/
'use strict'
const console = require('console')
const async = require('async')

const downloader = require('./metafileDownloader')
const parser = require('./metafileExtractor')

let ftpConfig = {
  host: 'ftp5.gwdg.de',
  remotePath: '/pub/misc/openstreetmap/openseamap/chartbundles/kap/'
}
let parserConfig = {
}

var program = require('commander')

program
  .option('-d, --no-downloadTask', 'No download of meta files')
  .option('-p, --no-parseTask', 'Do not parse metafiles')
  .option('--downloadPath [path]', 'Path to download the data files')
  .option('--metafilePath [path]', 'Path to create meta files')
  .option('--outputPath [path]', 'Path for file outputs')
  .parse(process.argv)

if (program.downloadPath) {
  ftpConfig.downloadPath = program.downloadPath
}
if (program.metafilePath) {
  ftpConfig.metafilePath = program.metafilePath
  parserConfig.metafilePath = program.metafilePath
}
if (program.outputPath) {
  parserConfig.outputPath = program.outputPath
}

let tasks = []

if (program.downloadTask) {
  console.log('adding download task')
  tasks.push((callback) => {
    downloader(ftpConfig, (err) => {
      callback(err)
    })
  })
}

if (program.parseTask) {
  console.log('adding parse task')
  tasks.push((callback) => {
    parser(
    parserConfig,
    (err) => {
      callback(err)
    }
  )
  })
}

async.series(
  tasks,
  (err) => {
    if (err) throw err
    console.log('finished all tasks')
  }
)
