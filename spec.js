import Db from './dist'

async function testIndex (db) {
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

  // Index 'diff'
  await db.index(['diff']) // or 'diff'
  await db.index(['common']) // or 'common'
  await db.put('key4', { diff: 4, qux: 8, common: 0 })

  await db.find({ diff: 4 }) // {key4: { diff: 4, qux: 8, common: 0 }}
  await db.find({ common: 0 }) // {key4: { diff: 4, qux: 8, common: 0 }}
  try {
    await db.find({ diff: 1 }) // Throws NotFoundError
  } catch (error) {
    if (!error.notFound) {
      throw error
    }
  }

  // rebuild index
  await db.reindex(['diff']) // or 'diff'
  await db.find({ diff: 1 }) // {key1: { diff: 1, foo: 2, common: 0 }}
  await db.find({ common: 0 }) // {key4: { diff: 4, qux: 8, common: 0 }}

  // rebuild index
  await db.reindex(['common']) // or 'common'
  await db.find({ common: 0 })
  /* {
    key1: { diff: 1, foo: 2, common: 0 }
    key2: { diff: 2, bar: 4, common: 0 }
    key3: { diff: 3, baz: 6, common: 0 }
    key4: { diff: 4, qux: 8, common: 0 }
  } */

  // Multi-Index
  await db.index(['diff', 'common'])
  await db.put('key5', { diff: 5, quux: 10, common: 0 })

  await db.find({diff: 5, common: 0}) // {key5: { diff: 5, quux: 10, common: 0 }}
  try {
    await db.find({ diff: 1, common: 0 }) // Throws NotFoundError
  } catch (error) {
    if (!error.notFound) {
      throw error
    }
  }

  // rebuild index
  await db.reindex(['diff, common'])
  await db.find({ diff: 1, common: 0 }) // {key1: { diff: 1, foo: 2, common: 0 }}

  // remove index
  await db.removeIndex(['common'])
  try {
    await db.find({ common: 0 }) // Throws NotFoundError
  } catch (error) {
    if (!error.notFound) {
      throw error
    }
  }

  return
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
  await db.index(['diff'], {unique: true}) // or 'diff'
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
    console.log(error.message) // Violation of Unique Index on 'diff'
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
    await db.index(['diff'], {unique: true}) // NotUniqueIndexKey
  } catch (error) {
    if (error.type !== 'NotUniqueIndexKey') {
      throw error
    }
    console.log(error.message) // Cannot index 'diff' as unique, key has already multiple values
  }

  return
}

async function test (db) {
  await testIndex(db)
  await testUniqueIndex(db)
}

const db = new Db('./testdb', {
  keyEncoding: 'json',
  valueEncoding: 'json',
})


test(db)
