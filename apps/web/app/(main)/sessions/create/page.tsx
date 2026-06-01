import { CreateSessionForm } from '@/components/session/CreateSessionForm'

export default function CreateSessionPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Create a study session</h1>
      <CreateSessionForm />
    </div>
  )
}
