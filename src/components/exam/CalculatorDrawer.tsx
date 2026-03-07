"use client";

import { useState, useCallback } from "react";

type CalculatorDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CalculatorDrawer({ isOpen, onClose }: CalculatorDrawerProps) {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<string | null>(null);
  const [op, setOp] = useState<string | null>(null);

  const input = useCallback((char: string) => {
    setDisplay((d) => {
      if (d === "0" && char !== ".") return char;
      return d + char;
    });
  }, []);

  const clear = useCallback(() => {
    setDisplay("0");
    setPrev(null);
    setOp(null);
  }, []);

  const operate = useCallback((nextOp: string) => {
    if (prev !== null && op) {
      const a = parseFloat(prev);
      const b = parseFloat(display);
      let result = 0;
      if (op === "+") result = a + b;
      else if (op === "-") result = a - b;
      else if (op === "×") result = a * b;
      else if (op === "÷") result = b !== 0 ? a / b : 0;
      setDisplay(String(result));
    }
    setPrev(display);
    setOp(nextOp);
  }, [prev, op, display]);

  const equals = useCallback(() => {
    if (prev && op) {
      const a = parseFloat(prev);
      const b = parseFloat(display);
      let result = 0;
      if (op === "+") result = a + b;
      else if (op === "-") result = a - b;
      else if (op === "×") result = a * b;
      else if (op === "÷") result = b !== 0 ? a / b : 0;
      setDisplay(String(result));
      setPrev(null);
      setOp(null);
    }
  }, [prev, op, display]);

  if (!isOpen) return null;

  const handleClick = (b: string) => {
    if (b === "C") clear();
    else if (["+", "-", "×", "÷"].includes(b)) operate(b);
    else if (b === "=") equals();
    else input(b);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="font-heading font-semibold text-slate-900 dark:text-white">
          Calculator
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="p-4">
        <div className="mb-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-right font-mono text-2xl text-slate-900 dark:text-white overflow-x-auto">
          {display}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {["C", "±", "%", "÷"].map((b) => (
            <button key={b} type="button" onClick={() => handleClick(b)} className={`p-4 rounded-lg font-medium ${["÷"].includes(b) ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"}`}>{b}</button>
          ))}
          {["7", "8", "9", "×"].map((b) => (
            <button key={b} type="button" onClick={() => handleClick(b)} className={`p-4 rounded-lg font-medium ${b === "×" ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"}`}>{b}</button>
          ))}
          {["4", "5", "6", "-"].map((b) => (
            <button key={b} type="button" onClick={() => handleClick(b)} className={`p-4 rounded-lg font-medium ${b === "-" ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"}`}>{b}</button>
          ))}
          {["1", "2", "3", "+"].map((b) => (
            <button key={b} type="button" onClick={() => handleClick(b)} className={`p-4 rounded-lg font-medium ${b === "+" ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"}`}>{b}</button>
          ))}
          <button type="button" onClick={() => handleClick("0")} className="col-span-2 p-4 rounded-lg font-medium bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700">0</button>
          <button type="button" onClick={() => handleClick(".")} className="p-4 rounded-lg font-medium bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700">.</button>
          <button type="button" onClick={() => handleClick("=")} className="p-4 rounded-lg font-medium bg-indigo-600 text-white">=</button>
        </div>
      </div>
    </div>
  );
}
