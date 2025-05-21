export type SymbolType = 'C' | 'L' | 'O' | 'W';

export interface SlotSymbol {
  icon: string;
  letter: SymbolType;
  reward: number;
}

export interface SlotResult {
  result: { icon: string; letter: SymbolType }[];
  reward: number;
  credits: number;
  rolls: number;
}

export interface SlotSession {
  credits: number;
  rolls: number;
  history: SlotResult[];
  ended: boolean;
} 