import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Newsletter sign-up.
 * Stage 2: validates input only. Stage 4 stores the address in the
 * `newsletter_subscribers` table in Supabase (with double opt-in email).
 */
export async function POST(request: Request) {
  let email: unknown;
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  if (typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ ok: false, message: "Please enter a valid email address." }, { status: 400 });
  }

  // TODO (Stage 4): insert into Supabase `newsletter_subscribers`.
  return NextResponse.json({
    ok: true,
    message: "Thank you. (Development mode: sign-ups are stored once the database is connected.)",
  });
}
