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
  localPath: './out', // local path for files to parse
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
      [e, n], [w, n], [w, s], [e, s], [e, n]
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

const handleBundle = (bundle) => {
  // console.log(util.inspect(bundle, false, null))
  const properties = getMatchingProps(bundle.$, config.properties)
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

module.exports = (configParams, fileList, callbackFunc) => {
  // save parameters
  if (callbackFunc) callback = callbackFunc
  Object.assign(config, configParams)
  mkdirp.sync(config.outputPath)

  console.log(`Going to parse ${fileList.length} files.`)

  let features = []
  async.forEach(
    fileList,
    (filename, localCallback) => {
      const parser = new xml2js.Parser()
      fs.readFile(config.localPath + '/' + filename, (err, data) => {
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
            localCallback()
            return
          }
          const feature = handleBundle(bundle)
          const outName = config.outputPath + '/' + feature.overview.properties.path + '.geojson'
          fs.writeFile(
            outName,
            JSON.stringify(feature.details),
            (err) => {
              if (err) {
                callback(err)
                return
              }

              features.push(feature.overview)
              console.log(`Done with file "${filename}"`)
              localCallback()
            }
          )
        })
      })
    },
    (err) => {
      console.log('finished parsing')
      const featureCollection = {
        type: 'FeatureCollection',
        features: features
      }
      callback(err, featureCollection)
    }
  )
}
