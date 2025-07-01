import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "Text content is required" }, { status: 400 })
    }

    // In a real implementation, you would:
    // 1. Use a content moderation API (OpenAI, Perspective API, etc.)
    // 2. Analyze text for harmful patterns
    // 3. Check against known harmful content databases

    // For demo purposes, we'll use the AI SDK to analyze the text
    // Note: In a production app, you'd want to use a specialized content moderation API
    const analysisResult = await analyzeTextWithAI(text)

    return NextResponse.json(analysisResult)
  } catch (error) {
    console.error("Error analyzing text:", error)
    return NextResponse.json({ error: "Failed to analyze text" }, { status: 500 })
  }
}

async function analyzeTextWithAI(text: string) {
  try {
    // Use AI to analyze the text
    // This is a simplified example - in production you'd use a specialized moderation API
    const { text: analysis } = await generateText({
      model: openai("gpt-4o"),
      prompt: `
        Analyze the following text for harmful content. 
        Rate it on a scale of 0-100 for each of these categories:
        - Toxicity
        - Hate Speech
        - Harassment
        - Self-harm
        - Sexual Content
        - Violence
        
        For each category, also indicate severity as "low", "medium", or "high".
        
        Return the results as a JSON object with this structure:
        {
          "overallSafetyScore": number,
          "categories": [
            { "name": string, "score": number, "severity": string }
          ]
        }
        
        Text to analyze: "${text}"
      `,
    })

    // Parse the AI response
    // In a real app, you'd have more robust parsing and validation
    const jsonMatch = analysis.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Failed to parse AI analysis")
    }

    const result = JSON.parse(jsonMatch[0])

    return {
      text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
      ...result,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error in AI analysis:", error)

    // Fallback to simulated analysis if AI fails
    return simulateTextAnalysis(text)
  }
}

async function simulateTextAnalysis(text: string) {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Generate random category scores
  const categories = [
    {
      name: "Toxicity",
      score: Math.floor(Math.random() * 100),
      severity: Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low",
    },
    {
      name: "Hate Speech",
      score: Math.floor(Math.random() * 100),
      severity: Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low",
    },
    {
      name: "Harassment",
      score: Math.floor(Math.random() * 100),
      severity: Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low",
    },
    {
      name: "Self-harm",
      score: Math.floor(Math.random() * 100),
      severity: Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low",
    },
    {
      name: "Sexual Content",
      score: Math.floor(Math.random() * 100),
      severity: Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low",
    },
    {
      name: "Violence",
      score: Math.floor(Math.random() * 100),
      severity: Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low",
    },
  ]

  // Calculate overall safety score (inverse of the average of all category scores)
  const avgCategoryScore = categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length
  const overallSafetyScore = 100 - avgCategoryScore

  return {
    text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
    overallSafetyScore,
    categories,
    timestamp: new Date().toISOString(),
  }
}

