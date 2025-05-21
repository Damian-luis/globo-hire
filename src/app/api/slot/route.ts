import { NextRequest, NextResponse } from 'next/server';
import type { SlotSession, SymbolType } from '../../../types/slot';
import { store } from '../sessionStore';

const SYMBOLS = [
  { icon: '🍒', letter: 'C', reward: 10 },
  { icon: '🍋', letter: 'L', reward: 20 },
  { icon: '🍊', letter: 'O', reward: 30 },
  { icon: '🍉', letter: 'W', reward: 40 },
];

function getRandomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function shouldReroll(credits: number) {
  if (credits >= 40 && credits <= 60) {
    return Math.random() < 0.3;
  }
  if (credits > 60) {
    return Math.random() < 0.6;
  }
  return false;
}

let session = store.session;

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
    session = store.session;
  }
  if (!session) {
    store.session = {
      credits: 10,
      rolls: 0,
      history: [],
      ended: false,
    };
    session = store.session;
  }

  if (session.ended) {
    return NextResponse.json({ error: 'Session ended' }, { status: 400 });
  }

  if (session.credits <= 0) {
    return NextResponse.json({ error: 'No credits left' }, { status: 400 });
  }
  session.credits -= 1;
  session.rolls += 1;

  let result = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

  const isWin = result.every((s) => s.letter === result[0].letter);

  if (isWin && shouldReroll(session.credits)) {
    do {
      result = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    } while (result.every((s) => s.letter === result[0].letter));
  }

  const finalIsWin = result.every((s) => s.letter === result[0].letter);
  let reward = 0;
  if (finalIsWin) {
    reward = SYMBOLS.find((s) => s.letter === result[0].letter)!.reward;
  }

  session.history.push({ result: result.map((s) => ({ icon: s.icon, letter: s.letter as SymbolType })), reward, credits: session.credits, rolls: session.rolls });

  return NextResponse.json({
    result: result.map((s) => ({ icon: s.icon, letter: s.letter as SymbolType })),
    reward,
    credits: session.credits,
    rolls: session.rolls,
  });
}

export async function DELETE() {
  session = {
    credits: 10,
    rolls: 0,
    history: [],
    ended: false,
  };
  return NextResponse.json({ message: 'Session reset', credits: session.credits, rolls: session.rolls });
} 