import Db from './dist'

async function test (db) {
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
}

const db = new Db('./testdb', {
  keyEncoding: 'json',
  valueEncoding: 'json',
})
test(db)
