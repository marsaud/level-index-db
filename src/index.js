import level from 'level-party'

export default class LevelIndexDb {
  constructor (path, config) {
    this._db = level(path, config)
  }
}
