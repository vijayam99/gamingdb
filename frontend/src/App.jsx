import { Gamepad2 } from 'lucide-react'

export default function App() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 text-white">
      <div className="flex items-center gap-3">
        <Gamepad2 className="size-10 text-violet-400" aria-hidden="true" />
        <h1 className="text-4xl font-bold">GamingDB</h1>
      </div>
    </main>
  )
}