
const pool = require('./db')

async function testDatabase() {
  try {
    const result = await pool.query(
      'SELECT current_database() AS database, NOW() AS server_time'
    )

    console.log('PostgreSQL connected successfully!')
    console.log('Database:', result.rows[0].database)
    console.log('Server time:', result.rows[0].server_time)
  } catch (error) {
    console.error('Database connection failed:', error.message)
  } finally {
    await pool.end()
  }
}

testDatabase()
