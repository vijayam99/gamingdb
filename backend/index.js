const express = require('express')

const app = express()
const port = 5000

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(port, '127.0.0.1', () => {
  console.log(`GamingDB API running at http://127.0.0.1:${port}`)
})