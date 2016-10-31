/**
* @license MIT
* @author aAXEe (https://github.com/aAXEe)
*/
'use strict'
const console = require('console')
const fs = require('fs')

const downloader = require('./metafileDownloader')
const parser = require('./metafileExtractor')

const ftpConfig = {
  host: 'ftp5.gwdg.de',
  remotePath: '/pub/misc/openstreetmap/openseamap/chartbundles/kap/',
  downloadPath: '/dataTmp'
}
const parserConfig = {
  localPath: ftpConfig.downloadPath,
  outputPath: '/dataOut'
}

downloader(ftpConfig, (err, filelist) => {
  if (err) throw err
  // console.dir(filelist)
  parser(
      parserConfig,
      filelist,
      (err, featureCollection) => {
        if (err) throw err
        // console.dir(featureCollection)
        const overviewName = parserConfig.outputPath + '/overview.geojson'
        fs.writeFileSync(overviewName, JSON.stringify(featureCollection))
        console.log(`wrote overview file to "${overviewName}"`)
      }
    )
})
