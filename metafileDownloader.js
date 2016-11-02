/**
* @license MIT
* @author aAXEe (https://github.com/aAXEe)
*/
'use strict'

const FtpClient = require('ftp')
const async = require('async')
const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')

const c = new FtpClient()

// default callback handler
let callback = (err, filelist) => {
  if (err) throw err
  console.log(`downloaded ${filelist.length} files:`, filelist)
}

// default config
let config = {
  protocol: 'ftp://',
  host: 'localhost', // the ftp host
  remotePath: '/', // the path on the ftp server
  filterExtension: '.xml', // file extension of the files to download
  downloadPath: './download', // local path for downloaded files
  metafilePath: './meta' // local path to write meta data for files
}

const writeMetaData = (config, entry, callback) => {
  const meta = {
    ftpData: entry,
    config: config,
    dataFile: path.resolve(config.downloadPath + '/' + entry.name)
  }
  const outName = config.metafilePath + '/' + entry.name + '.json'
  fs.writeFile(
    outName,
    JSON.stringify(meta),
    (err) => {
      if (err) {
        callback(err)
        return
      }
      console.log(`wrote meta data "${outName}"`)
      callback()
    }
  )
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
        metafiles.push(entry)
      })
      const numberOfFiles = metafiles.length
      console.log(`found ${numberOfFiles} files on server .. going to download them into "${config.downloadPath}".`)
      let filesFinished = 0

      // download all meta files
      async.forEach(
        metafiles,
        (entry, callback) => {
          // download data via ftp
          c.get(entry.name, (err, dataStream) => {
            if (err) {
              callback(err)
              return
            }
            // write data to local file
            const writePath = config.downloadPath + '/' + entry.name
            const writeStream = fs.createWriteStream(writePath)
            writeStream.on('finish', () => {
              writeMetaData(config, entry, (err) => {
                if (err) {
                  callback(err)
                  return
                }
                filesFinished++
                console.log(`finished file ${filesFinished} / ${numberOfFiles}: "${entry.name}"`)
                callback()
              })
            })
            writeStream.on('error', (err) => {
              filesFinished++
              console.log(`errored at file ${filesFinished} / ${numberOfFiles}: "${entry.name}"`)
              callback(err)
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
  mkdirp.sync(config.metafilePath)
  // kick of connecting and loading (see above)
  console.log(`going to connect to "${config.host}"`)
  c.connect(ftpConfig)
}
