import { NextResponse } from "next/server"
import { SESSION_COOKIE } from "@/lib/participant-session"

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(SESSION_COOKIE)
  return response
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const redirectTo = searchParams.get("next") ?? "/"
  const response = NextResponse.redirect(new URL(redirectTo, request.url))
  response.cookies.delete(SESSION_COOKIE)
  return response
}
