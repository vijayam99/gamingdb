import { Gamepad2 } from 'lucide-react'
import { useEffect, useState } from 'react'

const inputClass = 'mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-white focus:border-violet-400 focus:outline-2 focus:outline-violet-400'

export default function App() {
  const [mode, setMode] = useState('signup')
  const [checkingSession, setCheckingSession] = useState(true)
  const [signedInUsername, setSignedInUsername] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [createdUsername, setCreatedUsername] = useState('')
  const signingUp = mode === 'signup'

  useEffect(() => {
    const controller = new AbortController()

    async function restoreSession() {
      try {
        const response = await fetch('/api/session', { signal: controller.signal })
        if (response.status === 401) return
        if (!response.ok) throw new Error('Session check failed')

        const { username } = await response.json()
        if (!controller.signal.aborted) setSignedInUsername(username)
      } catch {
        if (!controller.signal.aborted) setError('Could not check your session. Please try again.')
      } finally {
        if (!controller.signal.aborted) setCheckingSession(false)
      }
    }

    restoreSession()
    return () => controller.abort()
  }, [])

  function switchMode(nextMode) {
    setError('')
    setCreatedUsername('')
    setMode(nextMode)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    setPending(true)
    setError('')

    try {
      const response = await fetch(signingUp ? '/api/signup' : '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: fields.get('username'), password: fields.get('password') }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Could not complete the request. Please try again.')
        return
      }

      form.reset()
      if (signingUp) {
        setCreatedUsername(result.username)
        setMode('login')
      } else {
        setSignedInUsername(result.username)
        setCreatedUsername('')
      }
    } catch {
      setError('Could not reach the account service. Please try again.')
    } finally {
      setPending(false)
    }
  }

  async function handleSignOut() {
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/session', { method: 'DELETE' })
      if (!response.ok) throw new Error('Sign-out failed')

      setSignedInUsername('')
      setMode('login')
    } catch {
      setError('Could not sign you out. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-slate-950 px-4 py-10 text-white [color-scheme:dark]">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8" aria-labelledby="account-heading">
        <div className="mb-7 flex items-center gap-2.5 text-lg font-bold">
          <Gamepad2 className="size-7 text-violet-400" aria-hidden="true" />
          GamingDB
        </div>
        {checkingSession ? (
          <h1 id="account-heading" role="status" className="text-2xl font-bold">Checking your session…</h1>
        ) : signedInUsername ? (
          <>
            <h1 id="account-heading" className="mb-6 break-words text-3xl font-bold tracking-tight">Welcome, {signedInUsername}.</h1>
            <button type="button" disabled={pending} onClick={handleSignOut} className="rounded-lg border border-slate-600 px-4 py-2.5 font-semibold hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-violet-300 disabled:opacity-60">
              {pending ? 'Signing out…' : 'Sign out'}
            </button>
          </>
        ) : (
          <>
            <h1 id="account-heading" className="mb-6 text-3xl font-bold tracking-tight">
              {signingUp ? 'Create an account' : 'Sign in'}
            </h1>
            <p role="status" className="mb-4 text-sm text-emerald-300 empty:m-0">
              {createdUsername && `Account created for ${createdUsername}.`}
            </p>
            <form key={mode} method="post" onSubmit={handleSubmit} className="space-y-5">
              <fieldset disabled={pending} className="space-y-5">
                <div>
                  <label htmlFor="username" className="font-medium">Username</label>
                  <input
                    id="username"
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    pattern="[A-Za-z0-9_]{3,24}"
                    defaultValue={createdUsername}
                    required
                    aria-describedby={signingUp ? 'username-hint' : undefined}
                    className={inputClass}
                  />
                  {signingUp && <p id="username-hint" className="mt-1.5 text-sm text-slate-300">3–24 letters, numbers, or underscores.</p>}
                </div>
                <div>
                  <label htmlFor="password" className="font-medium">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={signingUp ? 'new-password' : 'current-password'}
                    minLength={signingUp ? 15 : undefined}
                    maxLength={128}
                    required
                    aria-describedby={signingUp ? 'password-hint' : undefined}
                    className={inputClass}
                  />
                  {signingUp && <p id="password-hint" className="mt-1.5 text-sm text-slate-300">15–128 characters.</p>}
                </div>
              </fieldset>
              <button type="submit" disabled={pending} className="w-full rounded-lg bg-violet-300 px-4 py-2.5 font-semibold text-slate-950 hover:bg-violet-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 disabled:opacity-60">
                {signingUp ? (pending ? 'Creating account…' : 'Create account') : (pending ? 'Signing in…' : 'Sign in')}
              </button>
            </form>
            <p className="mt-5 text-sm text-slate-300">
              {signingUp ? 'Already have an account?' : 'Need an account?'}{' '}
              <button type="button" disabled={pending} onClick={() => switchMode(signingUp ? 'login' : 'signup')} className="font-semibold text-violet-300 underline underline-offset-4 hover:text-violet-200 focus-visible:outline-2 focus-visible:outline-violet-300 disabled:opacity-60">
                {signingUp ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          </>
        )}
        {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
      </section>
    </main>
  )
}
