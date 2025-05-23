'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSlot } from '../context/SlotContext';
import type { SlotResult } from '../types/slot';
import Swal from 'sweetalert2';

const revealDelays = [1000, 2000, 3000];
const RESET_SECONDS = 15;

export default function SlotMachine() {
  const slot = useSlot();
  const { result, loading, roll, cashout, addReward, error } = slot;
  const [credits, setCredits] = useState(slot.credits);
  const [rolls, setRolls] = useState(slot.rolls);
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
  const [cashedOut, setCashedOut] = useState(slot.cashedOut);
  const ambienceRef = useRef<HTMLAudioElement>(null);
  const winningRef = useRef<HTMLAudioElement | null>(null);
  const prevCreditsRef = useRef<number>(credits);

  useEffect(() => {
    const savedCredits = localStorage.getItem('slot_credits');
    const savedWallet = localStorage.getItem('slot_wallet');
    if (savedCredits !== null) setCredits(Number(savedCredits));
    if (savedWallet !== null) setWallet(Number(savedWallet));
  }, []);

  useEffect(() => {
    localStorage.setItem('slot_credits', String(credits));
  }, [credits]);

  useEffect(() => {
    localStorage.setItem('slot_wallet', String(wallet));
  }, [wallet]);

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
  }, [credits]);

  useEffect(() => {
    if (prevCreditsRef.current > 0 && credits === 0 && wallet === 0) {
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
    } else if (credits > 0 && prevCreditsRef.current === 0) {
      if (resetTimeout) clearTimeout(resetTimeout);
      setResetTimeout(null);
      localStorage.removeItem('slot_reset_time');
      setResetCounter(null);
    }
    prevCreditsRef.current = credits;
  }, [credits, resetTimeout, wallet]);

  useEffect(() => {
    if (resetCounter === null) return;
    if (resetCounter <= 0) return;
    const interval = setInterval(() => {
      setResetCounter((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [resetCounter]);

  useEffect(() => { setCredits(slot.credits); }, [slot.credits]);
  useEffect(() => { setRolls(slot.rolls); }, [slot.rolls]);
  useEffect(() => { setCashedOut(slot.cashedOut); }, [slot.cashedOut]);


  const swalCustomClass = {
    popup: 'rounded-xl bg-gray-900 text-yellow-400 border-4 border-yellow-400',
    title: 'text-3xl font-extrabold text-yellow-400',
    htmlContainer: 'text-lg text-white',
    confirmButton: 'bg-yellow-400 text-black font-bold px-6 py-2 rounded-lg mr-2',
    cancelButton: 'bg-gray-700 text-white font-bold px-6 py-2 rounded-lg',
  };

  const handleWalletClick = () => {
    Swal.fire({
      title: 'Wallet',
      html: `
        <div class="flex flex-col items-center gap-2 mt-4">
          <div class="text-lg text-black">
            <span class="font-semibold">Wallet credits:</span>
            <span class="font-bold text-yellow-400 ml-2">${wallet}</span>
          </div>
          <div class="text-lg text-black">
            <span class="font-semibold">Game credits:</span>
            <span class="font-bold text-yellow-400 ml-2">${credits}</span>
          </div>
        </div>
      `,
      customClass: swalCustomClass,
      confirmButtonText: 'Close',
      buttonsStyling: false,
    });
  };

  const handleRoll = async () => {
    if (credits <= 0 && wallet > 0) {
      const result = await Swal.fire({
        title: 'Reload credits?',
        text: `You have ${wallet} credits in your wallet. Do you want to reload them to play?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, reload',
        cancelButtonText: 'No',
        customClass: swalCustomClass,
        buttonsStyling: false,
      });
      if (result.isConfirmed) {
        setCredits(wallet);
        setWallet(0);
        setCanCashout(false);
        setShowReward(false);
        setCashoutPos(null);
        setCashoutDisabled(false);
        setCashedOut(false);
        return;
      } else {
        return;
      }
    }
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

  const revealBlocks = (rollResult: SlotResult | undefined) => {
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
            setCanCashout(isWin && rolls + 1 >= 2);
            setShowReward(isWin);
            setRollDisabled(false);
            if (isWin && rollResult) {
              winningRef.current = new Audio('/winning.mp3');
              winningRef.current.volume = 0.2;
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
      const res = await cashout({
        credits,
        rolls,
        ended: false,
        history: [],
      });
      if (res && typeof res.cashedOut === 'number' && res.cashedOut > 0) {
        setWallet((w) => w + res.cashedOut);
        setRevealed([false, false, false]);
        setCanCashout(false);
        setShowReward(false);
        setCashoutPos(null);
        setCashoutDisabled(false);
        setRollDisabled(false);
        setCashedOut(false);
      } else {
        setCanCashout(false);
        setCashoutPos(null);
        setCashoutDisabled(false);
        setRollDisabled(false);
      }
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
    <button
      type="button"
      onClick={handleWalletClick}
      className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-gray-900/90 px-4 py-2 rounded-full shadow-lg border-2 border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
      title="Show wallet details"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-credit-card"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
      <span className="text-yellow-300 font-bold text-lg">{wallet}</span>
    </button>
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
          disabled={loading || rollDisabled || resetCounter !== null || (credits <= 0 && wallet <= 0)}
        >
          {rolls === 0 ? 'Start' : 'Roll'}
        </button>
        <button
          className={`bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg disabled:bg-green-700 disabled:text-gray-300 disabled:cursor-not-allowed`}
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
      {credits === 0 && wallet === 0 && (
        <div className="text-red-400 font-bold mt-2">
          No credits left. You can try again in {resetCounter ?? RESET_SECONDS} seconds...
        </div>
      )}
      {result && result.reward > 0 && showReward && (
        <div className="text-2xl text-yellow-300 font-bold mt-2">+{result.reward} credits!</div>
      )}
      {cashedOut && credits === 0 && wallet === 0 && (
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