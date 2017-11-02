/**
* @license MIT
* @author aAXEe (https://github.com/aAXEe)
*/
'use strict'

const async = require('async')
const fs = require('fs')
const util = require('util')
const mkdirp = require('mkdirp')

// default callback handler
let callback = (err, filelist) => {
  if (err) throw err
  console.log(`downloaded ${filelist.length} files:`, filelist)
}

let config = {
  metafilePath: './meta', // local path for files to parse
  outputPath: './out', // path for the detail files to be written
  properties: [
    'name',
    'format',
    'path',
    'app'
  ],
  defaultProperties: {
    'format': 'KAP',
    'app': 'OpenCPN',
    'app:url': 'http://opencpn.org/ocpn/'
  }
}

const getMatchingProps = (object, propsToMatch) => {
  let props = config.defaultProperties
  for (let prop in object) {
    if (!object.hasOwnProperty(prop)) continue
    if (!(propsToMatch.indexOf(prop) > -1)) continue
    props[prop] = object[prop]
  }
  return props
}

const handleBundle = (metadata, bundle) => {
  // console.log(util.inspect(bundle, false, null))
  // console.log(util.inspect(metadata, false, null))
  let properties = getMatchingProps(bundle.properties, config.properties)
  properties.fileName = metadata.ftpData.name.substr(0, metadata.ftpData.name.length - metadata.config.filterExtension.length) +
    '.7z'
  properties.downloadUrl = metadata.config.protocol +
      metadata.config.host +
      metadata.config.remotePath +
      properties.fileName
  properties.date = metadata.ftpData.date

  const n = bundle.bbox[3]
  const s = bundle.bbox[1]
  const e = bundle.bbox[0]
  const w = bundle.bbox[2]
  const featureOverview = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [e, n], [w, n], [w, s], [e, s], [e, n]
      ]]
    },
    properties: properties
  }
  const featureDetails = {
    type: 'Feature',
    geometry: bundle.geometries,
    properties: properties
  }
  return {
    overview: featureOverview,
    details: featureDetails
  }
}

const handleXmlBundleFile = (config, metadata, callback) => {
  const filename = metadata.dataFile // absolut file to data file
  fs.readFile(filename, (err, data) => {
    if (err) {
      callback(err)
      return
    }

    const fileData = JSON.parse(data)
    const feature = handleBundle(metadata, fileData)
    const outName = config.outputPath + '/' + feature.overview.properties.fileName + '.geojson'
    fs.writeFile(
        outName,
        JSON.stringify(feature.details),
        (err) => {
          if (err) {
            callback(err)
            return
          }

          console.log(`Done with file "${filename}"`)
          callback(null, feature.overview)
        }
      )
  })
}

module.exports = (configParams, callbackFunc) => {
  // save parameters
  if (callbackFunc) callback = callbackFunc
  Object.assign(config, configParams)
  mkdirp.sync(config.outputPath)

  const fileList = fs.readdirSync(config.metafilePath)
  console.log(`Going to parse ${fileList.length} files.`)

  async.mapSeries(
    fileList,
    (filename, callback) => {
      fs.readFile(config.metafilePath + '/' + filename, (err, data) => {
        if (err) {
          callback(err)
          return
        }
        const metadata = JSON.parse(data)
        handleXmlBundleFile(config, metadata, (err, feature) => {
          if (err) {
            callback(err)
            return
          }
          // callback with deep copy as the original contents change later on (why?)
          callback(null, JSON.parse(JSON.stringify(feature)))
        })
      })
    },
    (err, features) => {
      if (err) {
        callback(err)
        return
      }
      console.log('finished parsing')
      const featureCollection = {
        type: 'FeatureCollection',
        features: features
      }
      console.log(util.inspect(featureCollection, false, null))
      const overviewName = config.outputPath + '/overview.geojson'
      fs.writeFile(overviewName, JSON.stringify(featureCollection), (err) => {
        console.log(`wrote overview file to "${overviewName}"`)
        callback(err)
      })
    }
  )
}
