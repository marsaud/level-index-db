import Db from '../dist'

const debug = (number, ...args) => console.log(`test${number}: `, ...args)

async function testIndex (db) {
  // No index
  await db.put('key1', { diff: 1, foo: 2, common: 0 })
  await db.put('key2', { diff: 2, bar: 4, common: 0 })
  await db.put('key3', { diff: 3, baz: 6, common: 0 })

  try {
    debug(1, await db.get('key1')) // { diff: 1, foo: 2, common: 0 }
    await db.find({ diff: 1 }) // Throws NotFoundError
  } catch (error) {
    debug(2, error)
    if (!error.notFound) {
      debug(3, 'UNHANDLED', error)
      throw error
    }
  }

  // Index 'diff'
  debug(4, await db.index(['diff'])) // or 'diff'
  debug(5, await db.index(['common'])) // or 'common'
  await db.put('key4', { diff: 4, qux: 8, common: 0 })

  debug(6, await db.find({ diff: 4 })) // {key4: { diff: 4, qux: 8, common: 0 }}
  debug(7, await db.find({ common: 0 })) // {key4: { diff: 4, qux: 8, common: 0 }}
  try {
    await db.find({ diff: 1 }) // Throws NotFoundError
  } catch (error) {
    debug(8, error)
    if (!error.notFound) {
      debug(9, 'UNHANDLED', error)
      throw error
    }
  }

  // rebuild index

  debug(10, await db.reindex())
  debug(11, await db.find({ diff: 1 })) // {key1: { diff: 1, foo: 2, common: 0 }}
  debug(12, await db.find({ common: 0 }))
  /* {
    key1: { diff: 1, foo: 2, common: 0 },
    key2: { diff: 2, bar: 4, common: 0 },
    key3: { diff: 3, baz: 6, common: 0 },
    key4: { diff: 4, qux: 8, common: 0 }
  } */

  // Multi-Index
  debug(13, await db.index(['diff', 'common']))
  await db.put('key5', { diff: 5, quux: 10, common: 0 })

  debug(14, await db.find({ diff: 5, common: 0 })) // {key5: { diff: 5, quux: 10, common: 0 }}
  try {
    await db.find({ diff: 1, common: 0 }) // Throws NotFoundError
  } catch (error) {
    debug(15, error)
    if (!error.notFound) {
      debug(16, 'UNHANDLED', error)
      throw error
    }
  }

  await db.put('key6', { diff: 1, variation: 99})
  // rebuild index
  debug(17, await db.reindex(['diff, common']))
  debug(18, await db.find({ diff: 1, common: 0 })) // {key1: { diff: 1, foo: 2, common: 0 }}
  debug(19, await db.find({ diff: 1}))
  /* {
    key1: { diff: 1, foo: 2, common: 0 },
    key6: { diff: 1, variation: 99 }
  } */
  debug(20, await db.find({ common: 0 }))
  /* {
    key1: { diff: 1, foo: 2, common: 0 },
    key2: { diff: 2, bar: 4, common: 0 },
    key3: { diff: 3, baz: 6, common: 0 },
    key4: { diff: 4, qux: 8, common: 0 }
  } */

  await db.dump()

  // remove index
  await db.removeIndex(['common'])
  try {
    await db.find({ common: 0 }) // Throws NotFoundError
  } catch (error) {
    if (!error.notFound) {
      throw error
    }
  }
}

async function testUniqueIndex (db) {
  // No index
  await db.put('key1', { diff: 1, foo: 2, common: 0 })
  await db.put('key2', { diff: 2, bar: 4, common: 0 })
  await db.put('key3', { diff: 3, baz: 6, common: 0 })

  try {
    await db.get('key1') // { diff: 1, foo: 2, common: 0 }
    await db.find({ diff: 1 }) // Throws NotFoundError
  } catch (error) {
    if (!error.notFound) {
      throw error
    }
  }

  // Index 'diff' as unique
  await db.index(['diff'], { unique: true }) // or 'diff'
  await db.put('key4', { diff: 4, qux: 8, common: 0 })

  await db.find({ diff: 4 }) // {key4: { diff: 4, qux: 8, common: 0 }}
  // AUTOMATICALLY Built on creation
  await db.find({ diff: 1 }) // {key1: { diff: 1, foo: 2, common: 0 }}

  try {
    await db.put('anyUnexistingKey', { diff: 1, corge: 99, common: 0 }) // Throws UniqueIndexViolation
  } catch (error) {
    if (error.type !== 'UniqueIndexViolation') {
      throw error
    }
    console.log('ERROR', error.message) // Violation of Unique Index on 'diff'
  }

  // remove index
  await db.removeIndex(['diff'])
  try {
    await db.find({ diff: 1 }) // Throws NotFoundError
  } catch (error) {
    if (!error.notFound) {
      throw error
    }
  }

  await db.put('anyUnexistingKey', { diff: 1, corge: 99, common: 0 })

  // Try to create unique index on non-unique values:
  try {
    await db.index(['diff'], { unique: true }) // NotUniqueIndexKey
  } catch (error) {
    if (error.type !== 'NotUniqueIndexKey') {
      throw error
    }
    console.log('ERROR', error.message) // Cannot index 'diff' as unique, key has already multiple values
  }
}

async function test (db) {
  await testIndex(db)
  // await testUniqueIndex(db)
}

const db = new Db('./testdb', {
  keyEncoding: 'json',
  valueEncoding: 'json',
})

test(db)
