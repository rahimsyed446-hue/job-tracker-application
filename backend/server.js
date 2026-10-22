
const express = require('express')
const cors = require('cors')
require('dotenv').config()

const pool = require('./db')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'JobTrack API is running successfully!' })
})

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({
      status: 'OK',
      message: 'Backend and PostgreSQL are connected.',
    })
  } catch (error) {
    console.error('Health check failed:', error.message)
    res.status(500).json({ status: 'ERROR', message: 'Database unavailable.' })
  }
})

// Get all applications
app.get('/api/applications', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM applications ORDER BY created_at DESC'
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Get applications failed:', error.message)
    res.status(500).json({ error: 'Failed to fetch applications.' })
  }
})

// Create an application
app.post('/api/applications', async (req, res) => {
  const {
    company,
    position,
    status = 'Applied',
    location = '',
    job_url = '',
    notes = '',
    applied_date,
  } = req.body

  if (
    typeof company !== 'string' ||
    !company.trim() ||
    typeof position !== 'string' ||
    !position.trim()
  ) {
    return res.status(400).json({
      error: 'Company and position are required.',
    })
  }

  try {
    const result = await pool.query(
      `INSERT INTO applications
       (company, position, status, location, job_url, notes, applied_date)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::date, CURRENT_DATE))
       RETURNING *`,
      [
        company.trim(),
        position.trim(),
        status,
        location,
        job_url,
        notes,
        applied_date || null,
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create application failed:', error.message)
    res.status(500).json({ error: 'Failed to create application.' })
  }
})

// Update an application
app.put('/api/applications/:id', async (req, res) => {
  const {
    company,
    position,
    status,
    location = '',
    job_url = '',
    notes = '',
    applied_date,
  } = req.body

  if (
    typeof company !== 'string' ||
    !company.trim() ||
    typeof position !== 'string' ||
    !position.trim()
  ) {
    return res.status(400).json({
      error: 'Company and position are required.',
    })
  }

  try {
    const result = await pool.query(
      `UPDATE applications
       SET company = $1,
           position = $2,
           status = $3,
           location = $4,
           job_url = $5,
           notes = $6,
           applied_date = COALESCE($7::date, applied_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        company.trim(),
        position.trim(),
        status || 'Applied',
        location,
        job_url,
        notes,
        applied_date || null,
        req.params.id,
      ]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Application not found.' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Update application failed:', error.message)
    res.status(500).json({ error: 'Failed to update application.' })
  }
})

// Delete an application
app.delete('/api/applications/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM applications WHERE id = $1 RETURNING id',
      [req.params.id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Application not found.' })
    }

    res.json({ message: 'Application deleted successfully.' })
  } catch (error) {
    console.error('Delete application failed:', error.message)
    res.status(500).json({ error: 'Failed to delete application.' })
  }
})

app.listen(PORT, () => {
  console.log(`JobTrack API running at http://localhost:${PORT}`)
})
