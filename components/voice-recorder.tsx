"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, Square, Loader2, Download } from "lucide-react"
import { transcribeAudio } from "@/app/actions/transcribe"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"

type TranscriptionResult = {
  text?: string
  error?: string
  timestamp?: string
}

export default function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [transcribing, setTranscribing] = useState(false)
  const [transcriptions, setTranscriptions] = useState<TranscriptionResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    setError(null)
    audioChunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1)
      }, 1000)
    } catch (err) {
      setError("Microphone access denied or not available")
      console.error("Error accessing microphone:", err)
    }
  }

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return

    mediaRecorderRef.current.stop()

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" })
      await handleTranscription(audioBlob)

      // Stop all tracks to release the microphone
      if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      }

      setIsRecording(false)
      setIsPaused(false)
    }
  }

  const handleTranscription = async (audioBlob: Blob) => {
    setTranscribing(true)

    try {
      const formData = new FormData()
      formData.append("audio", audioBlob)

      const result = await transcribeAudio(formData)

      if (result.error) {
        setError(result.error)
      } else {
        setTranscriptions((prev) => [result, ...prev])
      }
    } catch (err) {
      setError(`Transcription failed: ${err}`)
      console.error("Transcription error:", err)
    } finally {
      setTranscribing(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const downloadTranscription = (text: string, timestamp: string) => {
    const element = document.createElement("a")
    const file = new Blob([text], { type: "text/plain" })
    element.href = URL.createObjectURL(file)

    const date = new Date(timestamp)
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}_${date.getHours().toString().padStart(2, "0")}-${date.getMinutes().toString().padStart(2, "0")}`

    element.download = `transcription_${formattedDate}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="text-2xl font-semibold">{isRecording ? formatTime(recordingTime) : "Ready to Record"}</div>

            <div className="flex space-x-4">
              {!isRecording ? (
                <Button onClick={startRecording} className="bg-red-500 hover:bg-red-600">
                  <Mic className="mr-2 h-4 w-4" />
                  Start Recording
                </Button>
              ) : (
                <Button onClick={stopRecording} variant="destructive">
                  <Square className="mr-2 h-4 w-4" />
                  Stop Recording
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {transcribing && (
        <div className="flex justify-center items-center p-4">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Transcribing your audio...</span>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Transcriptions</h2>

        {transcriptions.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No transcriptions yet. Record something to get started!
          </p>
        ) : (
          transcriptions.map((result, index) => (
            <Card key={index} className="mb-4">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm text-muted-foreground">
                    {result.timestamp && new Date(result.timestamp).toLocaleString()}
                  </div>
                  {result.text && result.timestamp && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTranscription(result.text!, result.timestamp!)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  )}
                </div>
                <Textarea value={result.text || ""} readOnly className="min-h-[100px] resize-none" />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

