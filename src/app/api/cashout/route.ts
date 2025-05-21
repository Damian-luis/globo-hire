import { NextRequest, NextResponse } from 'next/server';
import type { SlotSession } from '../../../types/slot';
import { store } from '../sessionStore';

export async function POST(req: NextRequest) {
  let incomingSession = null;
  try {
    const body = await req.json();
    if (body && body.session) {
      incomingSession = body.session;
    }
  } catch {}

  if (incomingSession) {
    store.session = incomingSession;
  }

  let session = store.session;
  if (!session || session.ended) {
    return NextResponse.json({ error: 'No active session' }, { status: 400 });
  }

  if (session.rolls < 2) {
    return NextResponse.json({ error: 'You must roll at least twice before cashing out.' }, { status: 400 });
  }

  store.userAccount.credits += session.credits;
  const cashedOut = session.credits;
  session.credits = 0;

  return NextResponse.json({
    message: 'Cashed out successfully',
    credits: store.userAccount.credits,
    cashedOut,
  });
} 