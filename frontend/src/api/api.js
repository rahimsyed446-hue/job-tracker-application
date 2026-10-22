
import axios from 'axios'

const api = axios.create({
  baseURL: 'https://job-tracker-application-f6ew.onrender.com/api',
})

export default api
