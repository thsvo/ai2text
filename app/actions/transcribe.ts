"use server"

import { revalidatePath } from "next/cache"

export async function transcribeAudio(formData: FormData) {
  try {
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return { error: "No audio file provided" }
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer())

    // Use Hugging Face's API to transcribe the audio
    const response = await fetch(`${process.env.HUGGING_FACE_URL}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUGGING_FACE_ACCESS_TOKEN}`,
        "Content-Type": "audio/wav",
      },
      body: buffer,
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Hugging Face API error:", error)
      return { error: `Transcription failed: ${error}` }
    }

    const result = await response.json()
    revalidatePath("/")

    return {
      text: result.text || "No transcription returned",
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Transcription error:", error)
    return { error: `An error occurred during transcription: ${error}` }
  }
}

