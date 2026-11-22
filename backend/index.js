const express = require('express')
const mongoose = require('mongoose')

const app = express()
const port = 5000

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

async function start() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'gamingdb',
    serverSelectionTimeoutMS: 10000,
  })

  console.log('Connected to MongoDB')

  app.listen(port, '127.0.0.1', () => {
    console.log(`GamingDB API running at http://127.0.0.1:${port}`)
  })
}

start().catch((error) => {
  console.error('Backend startup failed:', error.name, error.code ?? '')
  process.exit(1)
})