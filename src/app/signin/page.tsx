import { signIn } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to TaskAgent</CardTitle>
          <CardDescription>Use your Google account to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: '/tasks' })
            }}
          >
            <Button type="submit" className="w-full">
              Continue with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
