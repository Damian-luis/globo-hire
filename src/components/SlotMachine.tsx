'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSlot } from '../context/SlotContext';

const revealDelays = [1000, 2000, 3000];
const RESET_SECONDS = 15;

export default function SlotMachine() {
  const { credits, rolls, result, loading, roll, cashout, addReward, cashedOut, error } = useSlot();
  const [revealed, setRevealed] = useState([false, false, false]);
  const [canCashout, setCanCashout] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [cashoutPos, setCashoutPos] = useState<{ x: number; y: number } | null>(null);
  const [cashoutDisabled, setCashoutDisabled] = useState(false);
  const [ambienceStarted, setAmbienceStarted] = useState(false);
  const [rollDisabled, setRollDisabled] = useState(false);
  const [wallet, setWallet] = useState(0);
  const [resetTimeout, setResetTimeout] = useState<NodeJS.Timeout | null>(null);
  const [resetCounter, setResetCounter] = useState<number | null>(null);
  const ambienceRef = useRef<HTMLAudioElement>(null);
  const winningRef = useRef<HTMLAudioElement | null>(null);


  useEffect(() => {
    if (ambienceStarted && ambienceRef.current) {
      ambienceRef.current.volume = 0.2;
      ambienceRef.current.loop = true;
      ambienceRef.current.play().catch(() => {});
    }
  }, [ambienceStarted]);


  useEffect(() => {
    const savedReset = localStorage.getItem('slot_reset_time');
    if (credits === 0 && savedReset) {
      const resetTime = parseInt(savedReset, 10);
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((resetTime - now) / 1000));
      setResetCounter(diff);
    }
  }, []);

  useEffect(() => {
    if (credits === 0) {
      const resetTime = Date.now() + RESET_SECONDS * 1000;
      localStorage.setItem('slot_reset_time', resetTime.toString());
      setResetCounter(RESET_SECONDS);
      if (resetTimeout) clearTimeout(resetTimeout);
      const timeout = setTimeout(async () => {
        setRevealed([false, false, false]);
        setCanCashout(false);
        setShowReward(false);
        setCashoutPos(null);
        setCashoutDisabled(false);
        setRollDisabled(false);
        setWallet(0);
        localStorage.removeItem('slot_reset_time');
        await fetch('/api/slot', { method: 'DELETE' }); 
        window.location.reload();
      }, RESET_SECONDS * 1000);
      setResetTimeout(timeout);
    } else if (resetTimeout) {
      clearTimeout(resetTimeout);
      setResetTimeout(null);
      localStorage.removeItem('slot_reset_time');
      setResetCounter(null);
    }
  }, [credits]);


  useEffect(() => {
    if (resetCounter === null) return;
    if (resetCounter <= 0) return;
    const interval = setInterval(() => {
      setResetCounter((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [resetCounter]);

  const handleRoll = async () => {
    setAmbienceStarted(true);
    setRevealed([false, false, false]);
    setCanCashout(false);
    setShowReward(false);
    setRollDisabled(true);
    setCashoutPos(null); 
    const rollResult = await roll({
      credits,
      rolls,
      ended: false,
      history: [],
    });
    revealBlocks(rollResult);
  };

  const revealBlocks = (rollResult: any) => {
    [0, 1, 2].forEach((i) => {
      setTimeout(() => {
        setRevealed((prev) => {
          const copy = [...prev];
          copy[i] = true;
          return copy;
        });
        if (i === 2) {
          setTimeout(() => {
            const isWin = !!(rollResult && rollResult.reward > 0);
            setCanCashout(isWin);
            setShowReward(isWin);
            setRollDisabled(false);
            if (isWin && rollResult) {
              winningRef.current = new Audio('/winning.mp3');
              winningRef.current.volume = 0.7;
              winningRef.current.play().catch(() => {});
              addReward(rollResult.reward); 
            }
          }, 100);
        }
      }, revealDelays[i]);
    });
  };

  const handleCashoutHover = () => {
    if (!canCashout) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const btnWidth = 160;
    const btnHeight = 56;
    const margin = 24;
    const minX = margin;
    const minY = margin;
    const maxX = vw - btnWidth - margin;
    const maxY = vh - btnHeight - margin;
    const newX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
    const newY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
    setCashoutPos({ x: newX, y: newY });
    if (Math.random() < 0.4) {
      setCashoutDisabled(true);
      setTimeout(() => setCashoutDisabled(false), 1500);
    }
  };

  const handleCashoutClick = async () => {
    if (!cashoutDisabled && canCashout) {
      const res: any = await cashout({
        credits,
        rolls,
        ended: false,
        history: [],
      });
      if (res && typeof res.cashedOut === 'number' && res.cashedOut > 0) {
        setWallet((w) => w + res.cashedOut);
      }
      setRevealed([false, false, false]);
      setCanCashout(false);
      setShowReward(false);
      setCashoutPos(null);
      setCashoutDisabled(false);
      setRollDisabled(false);
    }
  };

  const renderBlock = (i: number) => {
    if ((loading || rollDisabled) && !revealed[i]) {
      return (
        <div className="w-20 h-20 flex items-center justify-center animate-spin text-4xl">🔄</div>
      );
    }
    if (result && revealed[i]) {
      return (
        <div className="w-20 h-20 flex items-center justify-center text-4xl">
          {result.result[i]?.icon || '?'}
        </div>
      );
    }
    return <div className="w-20 h-20 flex items-center justify-center text-4xl">?</div>;
  };

  const WalletIcon = (
    <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-gray-900/90 px-4 py-2 rounded-full shadow-lg border-2 border-yellow-400">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-credit-card"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
      <span className="text-yellow-300 font-bold text-lg">{wallet}</span>
    </div>
  );

  const cashoutButtonStyle = canCashout && cashoutPos
    ? {
        position: 'fixed' as const,
        left: cashoutPos.x,
        top: cashoutPos.y,
        zIndex: 40,
        transition: 'left 0.3s, top 0.3s',
        pointerEvents: canCashout ? ('auto' as React.CSSProperties['pointerEvents']) : ('none' as React.CSSProperties['pointerEvents']),
      }
    : {};

  return (
    <div className="flex flex-col items-center gap-8 mt-10 relative" style={{ minHeight: 400 }}>
      <audio ref={ambienceRef} src="/ambience.mp3" style={{ display: 'none' }} />
      {WalletIcon}
      <div className="flex gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-gray-800 rounded-lg shadow-lg border-4 border-yellow-400 w-20 h-20 flex items-center justify-center text-4xl transition-all duration-500">
            {renderBlock(i)}
          </div>
        ))}
      </div>
      <div className="flex gap-4 items-center mt-4">
        <button
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-6 rounded-lg shadow-lg disabled:opacity-50"
          onClick={handleRoll}
          disabled={loading || cashedOut || credits <= 0 || rollDisabled || resetCounter !== null}
        >
          {rolls === 0 ? 'Start' : 'Roll'}
        </button>
        <button
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg disabled:opacity-50"
          style={cashoutButtonStyle}
          onMouseEnter={canCashout ? handleCashoutHover : undefined}
          onClick={handleCashoutClick}
          disabled={!canCashout || cashoutDisabled || cashedOut}
        >
          CASH OUT
        </button>
      </div>
      <div className="flex gap-8 mt-4">
        <div className="text-lg text-white">Credits: <span className="font-bold">{credits}</span></div>
        <div className="text-lg text-white">Rolls: <span className="font-bold">{rolls}</span></div>
      </div>
      {credits === 0 && (
        <div className="text-red-400 font-bold mt-2">
          No credits left. You can try again in {resetCounter ?? RESET_SECONDS} seconds...
        </div>
      )}
      {result && result.reward > 0 && showReward && (
        <div className="text-2xl text-yellow-300 font-bold mt-2">+{result.reward} credits!</div>
      )}
      {cashedOut && (
        <div className="text-2xl text-green-400 font-bold mt-2">Cashed out!</div>
      )}
      {error && error !== 'No active session' && (
        <div className="text-red-400 font-bold mt-2">{error}</div>
      )}
      {error === 'No active session' && cashedOut && (
        <div className="text-red-400 font-bold mt-2">{error}</div>
      )}
    </div>
  );
} 