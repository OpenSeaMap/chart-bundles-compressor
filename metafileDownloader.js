/**
* @license MIT
* @author aAXEe (https://github.com/aAXEe)
*/
'use strict'

const FtpClient = require('ftp')
const async = require('async')
const fs = require('fs')
const mkdirp = require('mkdirp')

const c = new FtpClient()

// default callback handler
let callback = (err, filelist) => {
  if (err) throw err
  console.log(`downloaded ${filelist.length} files:`, filelist)
}

// default config
let config = {
  host: 'localhost', // the ftp host
  remotePath: '/', // the path on the ftp server
  filterExtension: '.xml', // file extension of the files to download
  downloadPath: './out' // local path for downloaded files
}

c.on('ready', function () {
  console.log(`successfully connected .. trying to get the file list`)
  // change ftp path
  c.cwd(config.remotePath, (err) => {
    if (err) {
      callback(err)
      return
    }
    // get file list
    c.list(function (err, list) {
      if (err) {
        callback(err)
        return
      }
      // get all filenames for meta files (filtered by extension)
      let metafiles = []
      list.forEach((entry) => {
        const name = entry.name
        if (!name.endsWith(config.filterExtension)) return
        metafiles.push(name)
      })
      const numberOfFiles = metafiles.length
      console.log(`found ${numberOfFiles} files on server .. going to download them into "${config.downloadPath}".`)
      let filesFinished = 0

      // download all meta files
      async.forEach(
        metafiles,
        (name, localCallback) => {
          // download data via ftp
          c.get(name, (err, dataStream) => {
            if (err) {
              localCallback(err)
              return
            }
            // write data to local file
            const writePath = config.downloadPath + '/' + name
            const writeStream = fs.createWriteStream(writePath)
            writeStream.on('finish', () => {
              filesFinished++
              console.log(`finished file ${filesFinished} / ${numberOfFiles}: "${name}"`)
              localCallback()
            })
            writeStream.on('error', (err) => {
              filesFinished++
              console.log(`errored at file ${filesFinished} / ${numberOfFiles}: "${name}"`)
              localCallback(err)
            })
            dataStream.pipe(writeStream)
          })
        },
        (err) => {
          c.end()
          console.log('finished downloading')
          callback(err, metafiles)
        }
      )
    })
  })
})

module.exports = (ftpConfig, callbackFunc) => {
  // save parameters
  if (callbackFunc) callback = callbackFunc
  Object.assign(config, ftpConfig)
  mkdirp.sync(config.downloadPath)
  // kick of connecting and loading (see above)
  console.log(`going to connect to "${config.host}"`)
  c.connect(ftpConfig)
}
