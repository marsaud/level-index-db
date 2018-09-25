import Bluebird from 'bluebird'
import level from 'level-party'
import eventToPromise from 'event-to-promise'

const debugNamespaces = {
  _index: false,
  misc: false,
  put: false,
  reindex: false,
}
const debug = (namespace, number, ...args) => debugNamespaces[namespace] && console.log(`${namespace} ${number}: `, ...args)
/*
 * Checks that all elements of included are present in includer
 *
 * @param includer Array
 * @param included Array
 * @returns boolean
 */
const includes = function (includer, included) {
  let isIncluded = false
  for (const item of included) {
    if (includer.includes(item)) {
      isIncluded = true
    } else {
      isIncluded = false
      break
    }
  }
  return isIncluded
}

/*
 * Makes a deterministic index descriptor from various kind of sources
 *
 * @param input Array|string|Object
 * @returns Array
 */
const makeIndex = function (input) {
  if (Array.isArray(input)) {
    return input.slice().sort()
  }
  if (typeof input === 'string') {
    return [input]
  } else if (input !== null && typeof input === 'object') {
    return Object.keys(input).sort()
  }
  throw new Error('ILLEGAL INDEX DESCRIPTION')
}

/*
 * The key name for saving an index description
 */
const getNameFromIndex = fields => `~index~${JSON.stringify(fields)}`
/*
 * Re-deduces a, index descriptor from it's key name
 */
const getIndexFromName = name => JSON.parse(name.split('~').pop())
/*
 * The base key name to save indexed values followinf a given index name
 */
const getValueNameFromIndexName = indexName => {
  const words = indexName.split('~')
  words[1] = 'value'
  return words.join('~')
}

export default class LevelIndexDb {
  constructor (path, config) {
    this._db = level(path, config)
    Bluebird.promisifyAll(this._db)
    this._indexes = {}
  }

  async put (key, value, options) {
    debug('put', 30)
    const output = await this._db.putAsync(key, value, options)
    await this._index(key, value)
    return output
  }

  async _index (key, value) {
    const fields = makeIndex(value)
    debug('_index', 10, value, fields)
    for (const indexName in this._indexes) {
      const index = getIndexFromName(indexName)
      if (includes(fields, index)) {
        debug('_index', 11, index)
        const indexedValues = []
        for (const k of index) {
          indexedValues.push(value[k])
        }
        debug('_index', 12, indexedValues)
        const valueName = getValueNameFromIndexName(indexName)
        debug('_index', 13, valueName)
        const valueKey = `${valueName}~${JSON.stringify(indexedValues)}`
        debug('_index', 14, valueKey)
        let indexContent
        try {
          indexContent = await this._db.getAsync(valueKey)
          debug('_index', 15, indexContent)
        } catch (error) {
          if (error.notFound) {
            debug('_index', 16, error)
            indexContent = []
          } else {
            debug('_index', 17, 'UNHANDLED', error)
            throw error
          }
        }
        // TODO key has been modified, we must remove it from some other no-more-matching indexes
        debug('_index', 18, indexContent)
        const newContent = []
        indexContent.forEach(contentKey => {
          if (contentKey !== key) {
            newContent.push(contentKey)
          }
        })
        newContent.push(key)
        debug('_index', 19, valueKey, newContent)
        await this._db.put(valueKey, newContent.sort())
      }
    }
  }

  get (key, options) {
    debug('misc', 1, key, options)
    return this._db.getAsync(key, options)
  }

  async find (map, options) {
    const index = makeIndex(map)
    debug('misc', 2, index)
    const indexName = getNameFromIndex(index)
    debug('misc', 3, indexName)
    const valueName = getValueNameFromIndexName(indexName)
    debug('misc', 4, valueName)
    const searchedValues = []
    for (const k of index) {
      searchedValues.push(map[k])
    }
    debug('misc', 5, searchedValues)
    const valueKey = `${valueName}~${JSON.stringify(searchedValues)}`
    debug('misc', 6, valueKey)
    const indexedKeys = await this._db.getAsync(valueKey)
    const indexedValues = {}
    for (const indexedKey of indexedKeys) {
      indexedValues[indexedKey] = await this._db.getAsync(indexedKey)
    }
    return indexedValues
  }

  async index (fields) {
    const index = makeIndex(fields)
    debug('misc', 7, fields, index)
    const indexName = getNameFromIndex(index)
    debug('misc', 8, fields, indexName)
    if (indexName in this._indexes || await this._defaultGet(indexName, false)) {
      debug('misc', 9, indexName, this._indexes, await this._defaultGet(indexName, false))
      throw new Error(`${index} ALREADY EXISTS`)
    }
    this._indexes[indexName] = {}
    await this._db.putAsync(indexName, this._indexes[indexName])
  }

  _defaultGet (key, defaultValue) {
    return this._db.getAsync(key)
      .catch(error => {
        if (error.notFound) {
          return defaultValue
        }
        throw error
      })
  }

  async reindex (fields) {
    const stream = this._db.createReadStream()
    let promise = Bluebird.resolve()
    stream.on('data', ({ key, value }) => {
      if (key[0] !== '~') {
        debug('reindex', 20, key, value)
        promise = promise.then(() => this._index(key, value))
      }
    })
    await eventToPromise(stream, 'end')
    await promise
  }

  async dump () {
    const stream = this._db.createReadStream()
    console.log('DUMP START')
    stream.on('data', ({ key, value }) => {
      console.log(key, value)
    })
    await eventToPromise(stream, 'end')
    console.log('DUMP END')
  }
}
