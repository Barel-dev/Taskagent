import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </main>
  )
}
