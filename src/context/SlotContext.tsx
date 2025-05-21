'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SlotResult } from '../types/slot';
import type { SlotSession } from '../types/slot';

interface SlotContextProps {
  credits: number;
  rolls: number;
  result: SlotResult | null;
  loading: boolean;
  roll: (sessionOverride?: Partial<SlotSession>) => Promise<SlotResult | undefined>;
  cashout: (sessionOverride?: Partial<SlotSession>) => Promise<{ message: string; credits: number; cashedOut: number } | undefined>;
  addReward: (reward: number) => void;
  cashedOut: boolean;
  error: string | null;
}

const SlotContext = createContext<SlotContextProps | undefined>(undefined);

export const SlotProvider = ({ children }: { children: ReactNode }) => {
  const [credits, setCredits] = useState(10);
  const [rolls, setRolls] = useState(0);
  const [result, setResult] = useState<SlotResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roll = async (sessionOverride?: Partial<SlotSession>): Promise<SlotResult | undefined> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionOverride ? { session: sessionOverride } : {}),
      });
      const data: SlotResult = await res.json();
      if (!res.ok) throw new Error(typeof data === "object" && data !== null && "error" in data ? (data as { error: string }).error : "Error");
      setResult(data);
      setCredits(data.credits);
      setRolls(data.rolls);
      return data;
    } catch (e) {
      if (e instanceof Error) setError(e.message);
      else setError('Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const cashout = async (sessionOverride?: Partial<SlotSession>): Promise<{ message: string; credits: number; cashedOut: number } | undefined> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionOverride ? { session: sessionOverride } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setCashedOut(true);
      setCredits(0);
      return data;
    } catch (e) {
      if (e instanceof Error) setError(e.message);
      else setError('Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const addReward = (reward: number) => {
    setCredits((c) => c + reward);
  };

  return (
    <SlotContext.Provider value={{ credits, rolls, result, loading, roll, cashout, addReward, cashedOut, error }}>
      {children}
    </SlotContext.Provider>
  );
};

export const useSlot = () => {
  const context = useContext(SlotContext);
  if (!context) throw new Error('useSlot must be used within SlotProvider');
  return context;
}; 