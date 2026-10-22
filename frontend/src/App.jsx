
import { useState, useEffect } from 'react'
import api from './api/api'
import './App.css'

const emptyForm = () => ({
  company: '',
  role: '',
  location: '',
  status: 'Applied',
  date: new Date().toISOString().slice(0, 10),
})

function mapDatabaseJob(job) {
  return {
    id: job.id,
    company: job.company,
    role: job.position,
    location: job.location || '',
    status: job.status,
    date: String(job.applied_date).slice(0, 10),
  }
}

function App() {
  const [jobs, setJobs] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [editingJob, setEditingJob] = useState(null)
  const [backendStatus, setBackendStatus] = useState('Checking backend...')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  // Load applications from PostgreSQL
  async function loadApplications() {
    try {
      const response = await api.get('/applications')
      setJobs(response.data.map(mapDatabaseJob))
      setErrorMessage('')
    } catch (error) {
      console.error('Failed to load applications:', error.message)
      setErrorMessage('Could not load applications. Check the backend server.')
    }
  }

  // Check backend and database, then load applications
  useEffect(() => {
    async function initialize() {
      try {
        await api.get('/health')
        setBackendStatus('Backend and PostgreSQL connected')
        await loadApplications()
      } catch (error) {
        console.error('Backend connection failed:', error.message)
        setBackendStatus('Backend offline')
        setErrorMessage('Start the backend server and refresh this page.')
      }
    }

    initialize()
  }, [])

  function resetForm() {
    setForm(emptyForm())
    setShowForm(false)
    setEditingJob(null)
    setErrorMessage('')
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  // Add a new application to PostgreSQL
  async function addJob(event) {
    event.preventDefault()
    setIsSaving(true)
    setErrorMessage('')

    try {
      const response = await api.post('/applications', {
        company: form.company.trim(),
        position: form.role.trim(),
        location: form.location.trim(),
        status: form.status,
        applied_date: form.date,
      })

      setJobs((previous) => [
        mapDatabaseJob(response.data),
        ...previous,
      ])
      resetForm()
    } catch (error) {
      console.error('Failed to save application:', error)
      setErrorMessage(
        error.response?.data?.error || 'Could not save application.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  function startEdit(job) {
    setForm({
      company: job.company,
      role: job.role,
      location: job.location || '',
      status: job.status,
      date: job.date,
    })
    setEditingJob(job.id)
    setShowForm(true)
    setErrorMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Update an existing application in PostgreSQL
  async function updateJob(event) {
    event.preventDefault()
    setIsSaving(true)
    setErrorMessage('')

    try {
      const response = await api.put(`/applications/${editingJob}`, {
        company: form.company.trim(),
        position: form.role.trim(),
        location: form.location.trim(),
        status: form.status,
        applied_date: form.date,
      })

      const updatedJob = mapDatabaseJob(response.data)

      setJobs((previous) =>
        previous.map((job) =>
          job.id === editingJob ? updatedJob : job
        )
      )

      resetForm()
    } catch (error) {
      console.error('Failed to update application:', error)
      setErrorMessage(
        error.response?.data?.error || 'Could not update application.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  // Delete an application from PostgreSQL
  async function deleteJob(id) {
    if (!window.confirm('Are you sure you want to delete this application?')) {
      return
    }

    setErrorMessage('')

    try {
      await api.delete(`/applications/${id}`)
      setJobs((previous) => previous.filter((job) => job.id !== id))

      if (editingJob === id) {
        resetForm()
      }
    } catch (error) {
      console.error('Failed to delete application:', error)
      setErrorMessage(
        error.response?.data?.error || 'Could not delete application.'
      )
    }
  }

  const filteredJobs = jobs.filter((job) =>
    `${job.company} ${job.role} ${job.location}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  function countByStatus(status) {
    return jobs.filter((job) => job.status === status).length
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="brand">
          JobTrack<span>.</span>
        </h2>

        <p className="sidebar-label">WORKSPACE</p>
        <div className="nav-item active">▦ &nbsp; Dashboard</div>
        <div className="nav-item">▤ &nbsp; Applications</div>

        <div className="sidebar-note">
          <strong>Your career, organized.</strong>
          <p>Keep every application in one place.</p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">OVERVIEW</p>
            <h1>Job Applications</h1>
            <p className="subtitle">
              Track your search and take the next step in your career.
            </p>
            <p className="backend-status">{backendStatus}</p>
          </div>

          <button
            className="primary-button"
            onClick={() => {
              if (showForm) {
                resetForm()
              } else {
                setForm(emptyForm())
                setEditingJob(null)
                setErrorMessage('')
                setShowForm(true)
              }
            }}
          >
            + Add application
          </button>
        </header>

        {errorMessage && (
          <div className="error-message" role="alert">
            {errorMessage}
          </div>
        )}

        <section className="stats">
          <article className="stat-card">
            <span>Total applications</span>
            <strong>{jobs.length}</strong>
            <small>All jobs tracked</small>
          </article>

          <article className="stat-card">
            <span>Applied</span>
            <strong>{countByStatus('Applied')}</strong>
            <small>Applications submitted</small>
          </article>

          <article className="stat-card">
            <span>Interviews</span>
            <strong>{countByStatus('Interview')}</strong>
            <small>Interview opportunities</small>
          </article>

          <article className="stat-card">
            <span>Offers</span>
            <strong>{countByStatus('Offer')}</strong>
            <small>Offers received</small>
          </article>
        </section>

        {showForm && (
          <form
            className="job-form"
            onSubmit={editingJob ? updateJob : addJob}
          >
            <h2>
              {editingJob ? 'Edit job application' : 'Add a job application'}
            </h2>

            <div className="form-grid">
              <label>
                Company *
                <input
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  placeholder="e.g. Infosys"
                  required
                />
              </label>

              <label>
                Job title *
                <input
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  placeholder="e.g. Junior Web Developer"
                  required
                />
              </label>

              <label>
                Location
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Remote"
                />
              </label>

              <label>
                Status
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option>Applied</option>
                  <option>Interview</option>
                  <option>Offer</option>
                  <option>Rejected</option>
                </select>
              </label>

              <label>
                Application date
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
                disabled={isSaving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={isSaving}
              >
                {isSaving
                  ? 'Saving...'
                  : editingJob
                    ? 'Save changes'
                    : 'Save application'}
              </button>
            </div>
          </form>
        )}

        <section className="applications">
          <div className="section-heading">
            <div>
              <h2>Recent applications</h2>
              <p>Manage and review the jobs you've applied for.</p>
            </div>

            <input
              className="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search jobs..."
              aria-label="Search jobs"
            />
          </div>

          {filteredJobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">▤</div>
              <h3>
                {jobs.length === 0
                  ? 'No applications yet'
                  : 'No matching applications'}
              </h3>
              <p>
                {jobs.length === 0
                  ? 'Add your first job application to start tracking your progress.'
                  : 'Try a different company, role or location.'}
              </p>

              {jobs.length === 0 && (
                <button
                  className="primary-button"
                  onClick={() => {
                    setForm(emptyForm())
                    setShowForm(true)
                  }}
                >
                  + Add your first application
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>COMPANY / ROLE</th>
                    <th>LOCATION</th>
                    <th>DATE</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredJobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <strong>{job.company}</strong>
                        <span className="role-name">{job.role}</span>
                      </td>
                      <td>{job.location || '—'}</td>
                      <td>{job.date}</td>
                      <td>
                        <span
                          className={`status status-${job.status.toLowerCase()}`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="edit-button"
                          onClick={() => startEdit(job)}
                        >
                          Edit
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => deleteJob(job.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer>
          JobTrack · Built to organize your next career move.
        </footer>
      </main>
    </div>
  )
}

export default App
