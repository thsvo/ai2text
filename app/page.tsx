import VoiceRecorder from "@/components/voice-recorder"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24">
      <div className="z-10 w-full max-w-3xl">
        <h1 className="text-4xl font-bold text-center mb-8">Voice to Text Converter</h1>
        <VoiceRecorder />
      </div>
    </main>
  )
}

