/**
* @license MIT
* @author aAXEe (https://github.com/aAXEe)
*/
'use strict'

const async = require('async')
const fs = require('fs')
const xml2js = require('xml2js')
// const util = require('util')
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
  ]
}

const getMatchingProps = (object, propsToMatch) => {
  let props = {}
  for (let prop in object) {
    if (!object.hasOwnProperty(prop)) continue
    if (!(propsToMatch.indexOf(prop) > -1)) continue
    props[prop] = object[prop]
  }
  return props
}

const getGeometryFromMapTags = (mapTags) => {
  let polygonsCoords = []
  let nMax = -180
  let sMax = 180
  let eMax = -180
  let wMax = 180
  for (const map of mapTags) {
    const n = Number(map.$.north)
    const s = Number(map.$.south)
    const e = Number(map.$.east)
    const w = Number(map.$.west)
    nMax = Math.max(nMax, n)
    sMax = Math.min(sMax, s)
    eMax = Math.max(eMax, e)
    wMax = Math.min(wMax, w)
    polygonsCoords.push([[
      [e, n], [e, s], [w, s], [w, n], [e, n]
    ]])
  }
  let geometries = {
    'type': 'MultiPolygon',
    'coordinates': polygonsCoords
  }
  return {
    geometries: geometries,
    bbox: {
      west: wMax,
      south: sMax,
      east: eMax,
      north: nMax
    }
  }
}

const handleBundle = (metadata, bundle) => {
  // console.log(util.inspect(bundle, false, null))
  let properties = getMatchingProps(bundle.$, config.properties)
  properties.downloadUrl = metadata.config.protocol +
      metadata.config.host +
      metadata.config.remotePath +
      metadata.ftpData.name
  properties.date = metadata.ftpData.date

  const geometry = getGeometryFromMapTags(bundle.map)
  const n = geometry.bbox.north
  const s = geometry.bbox.south
  const e = geometry.bbox.east
  const w = geometry.bbox.west
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
    geometry: geometry.geometries,
    properties: properties
  }
  return {
    overview: featureOverview,
    details: featureDetails
  }
}

const handleXmlBundleFile = (config, metadata, callback) => {
  const parser = new xml2js.Parser()
  const filename = metadata.dataFile // absolut file to data file
  fs.readFile(filename, (err, data) => {
    if (err) {
      callback(err)
      return
    }
    parser.parseString(data, (err, result) => {
      if (err) {
        callback(err)
        return
      }
      const bundle = result.bundle
      if (!bundle) {
        console.error(`File "${filename}" contains no <bundle> tag.`)
        callback()
        return
      }
      const feature = handleBundle(metadata, bundle)
      const outName = config.outputPath + '/' + feature.overview.properties.path + '.geojson'
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
  })
}

module.exports = (configParams, callbackFunc) => {
  // save parameters
  if (callbackFunc) callback = callbackFunc
  Object.assign(config, configParams)
  mkdirp.sync(config.outputPath)

  const fileList = fs.readdirSync(config.metafilePath)
  console.log(`Going to parse ${fileList.length} files.`)

  let features = []
  async.forEach(
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
          features.push(feature)
          callback()
        })
      })
    },
    (err) => {
      if (err) {
        callback(err)
        return
      }
      console.log('finished parsing')
      const featureCollection = {
        type: 'FeatureCollection',
        features: features
      }
      const overviewName = config.outputPath + '/overview.geojson'
      fs.writeFile(overviewName, JSON.stringify(featureCollection), (err) => {
        console.log(`wrote overview file to "${overviewName}"`)
        callback(err)
      })
    }
  )
}
