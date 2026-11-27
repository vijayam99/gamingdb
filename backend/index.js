const { createHash, randomBytes, scrypt, timingSafeEqual } = require('node:crypto')
const { once } = require('node:events')
const { promisify } = require('node:util')
const express = require('express')
const mongoose = require('mongoose')

const app = express()
const port = Number(process.env.PORT || 5000)
const deriveKey = promisify(scrypt)
const scryptOptions = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }
const scryptPrefix = `scrypt$${scryptOptions.N}$${scryptOptions.r}$${scryptOptions.p}$`
const authPaths = ['/api/signup', '/api/login', '/api/session']
const parseCredentials = express.json({ limit: '2kb' })
const sessionCookie = 'gamingdb_session'
const sessionDuration = 8 * 60 * 60 * 1000
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/api',
}

const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
}))

const Session = mongoose.model('Session', new mongoose.Schema({
  _id: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { versionKey: false }))

function normalizeUsername(username) {
  const trimmed = typeof username === 'string' ? username.trim() : ''
  return /^[A-Za-z0-9_]{3,24}$/.test(trimmed) ? trimmed.toLowerCase() : ''
}

async function passwordMatches(password, passwordHash = '') {
  const digest = passwordHash.startsWith(scryptPrefix) ? passwordHash.slice(scryptPrefix.length) : ''
  const stored = /^([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(digest)

  // Derive a key for unknown usernames too, so timing doesn't reveal account existence.
  const salt = stored ? Buffer.from(stored[1], 'hex') : Buffer.alloc(16)
  const expected = stored ? Buffer.from(stored[2], 'hex') : Buffer.alloc(64)
  const actual = await deriveKey(password, salt, expected.length, scryptOptions)
  return timingSafeEqual(actual, expected) && stored !== null
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function readSessionId(req) {
  const cookie = req.headers.cookie?.match(/(?:^|;\s*)gamingdb_session=([a-f0-9]{64})(?:;|$)/)
  return cookie ? hashSessionToken(cookie[1]) : null
}

async function requireUser(req, res, next) {
  const id = readSessionId(req)
  const session = id && await Session.findOne({ _id: id, expiresAt: { $gt: new Date() } })
  if (!session) return res.status(401).json({ error: 'Sign in to continue.' })

  req.userId = session.user
  return next()
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use(authPaths, (_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

app.post('/api/signup', parseCredentials, async (req, res) => {
  const { username, password } = req.body ?? {}
  const normalizedUsername = normalizeUsername(username)

  if (!normalizedUsername) {
    return res.status(400).json({ error: 'Use 3–24 letters, numbers, or underscores for your username.' })
  }

  if (typeof password !== 'string' || password.length < 15 || password.length > 128) {
    return res.status(400).json({ error: 'Use 15–128 characters for your password.' })
  }

  try {
    const salt = randomBytes(16)
    const key = await deriveKey(password, salt, 64, scryptOptions)
    const passwordHash = `${scryptPrefix}${salt.toString('hex')}$${key.toString('hex')}`
    const user = await User.create({ username: normalizedUsername, passwordHash })

    return res.status(201).json({ username: user.username })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'That username is already taken.' })
    }

    console.error('Signup failed:', error.name, error.code ?? '')
    return res.status(500).json({ error: 'Could not create your account. Please try again.' })
  }
})

app.post('/api/login', parseCredentials, async (req, res) => {
  const { username, password } = req.body ?? {}
  const normalizedUsername = normalizeUsername(username)

  if (!normalizedUsername || typeof password !== 'string' || !password || password.length > 128) {
    return res.status(400).json({ error: 'Enter a valid username and password.' })
  }

  const user = await User.findOne({ username: normalizedUsername }).select('+passwordHash')
  if (!await passwordMatches(password, user?.passwordHash)) {
    return res.status(401).json({ error: 'Incorrect username or password.' })
  }

  const token = randomBytes(32).toString('hex')
  await Session.create({
    _id: hashSessionToken(token),
    user: user._id,
    expiresAt: new Date(Date.now() + sessionDuration),
  })

  res.cookie(sessionCookie, token, { ...cookieOptions, maxAge: sessionDuration })
  return res.json({ username: user.username })
})

app.get('/api/session', async (req, res) => {
  const id = readSessionId(req)
  const session = id && await Session.findOne({ _id: id, expiresAt: { $gt: new Date() } })
    .populate('user', 'username')

  if (!session?.user) {
    return res.status(401).json({ error: 'Sign in to continue.' })
  }

  return res.json({ username: session.user.username })
})

app.delete('/api/session', async (req, res) => {
  const id = readSessionId(req)
  if (id) await Session.deleteOne({ _id: id })

  return res.clearCookie(sessionCookie, cookieOptions).status(204).end()
})

app.use(authPaths, (error, _req, res, _next) => {
  if (error.status === 413) {
    return res.status(413).json({ error: 'Request is too large.' })
  }

  if (error.status === 400 || error.status === 415) {
    return res.status(error.status).json({ error: 'Send the account details as JSON.' })
  }

  console.error('Account request failed:', error.name, error.code ?? '')
  return res.status(500).json({ error: 'Could not complete the request. Please try again.' })
})

const friends = require('./friends')
app.use('/api/friends', express.json({ limit: '2kb' }), requireUser, friends.router)

// use steam api steam-route.js file
app.use('/api/steam', requireUser, require('./steam-route'))

async function start() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'gamingdb',
    serverSelectionTimeoutMS: 10000,
  })
  await Promise.all([User.init(), Session.init(), friends.FriendRequest.init()])

  console.log('Connected to MongoDB')

  const server = app.listen(port, '127.0.0.1')
  await once(server, 'listening')
  console.log(`GamingDB API running at http://127.0.0.1:${server.address().port}`)
}

start().catch((error) => {
  console.error('Backend startup failed:', error.name, error.code ?? '')
  process.exit(1)
})
