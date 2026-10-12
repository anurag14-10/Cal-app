"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { evaluateExpression, AngleMode } from "@/lib/calculatorEngine";
import { sounds } from "@/lib/soundEffects";
import { CalculationRecord } from "@/lib/db";

interface CalculatorProps {
  onCalculationSaved: (calc: CalculationRecord) => void;
  selectedExpression?: string;
  selectedResult?: string;
  onClearSelected?: () => void;
  showToast: (msg: string) => void;
}

export const Calculator: React.FC<CalculatorProps> = ({
  onCalculationSaved,
  selectedExpression,
  selectedResult,
  onClearSelected,
  showToast,
}) => {
  // State
  const [expression, setExpression] = useState<string>("");
  const [result, setResult] = useState<string>("0");
  const [preview, setPreview] = useState<string>("");
  const [mode, setMode] = useState<"standard" | "scientific">("standard");
  const [angleMode, setAngleMode] = useState<AngleMode>("DEG");
  const [memoryVal, setMemoryVal] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const expressionRef = useRef<HTMLDivElement>(null);

  // Sync sounds controller
  useEffect(() => {
    sounds.enabled = soundEnabled;
  }, [soundEnabled]);

  // Load initial memory from SQLite
  useEffect(() => {
    fetch("/api/memory?slot=M")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && typeof data.value === "number") {
          setMemoryVal(data.value);
        }
      })
      .catch(() => {});
  }, []);

  // Update memory in SQLite
  const saveMemoryToDb = async (val: number) => {
    setMemoryVal(val);
    try {
      await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: "M", value: val }),
      });
    } catch (err) {
      console.error("Failed to update memory in DB:", err);
    }
  };

  // React to selected item from history sidebar
  useEffect(() => {
    if (selectedExpression !== undefined && selectedExpression !== "") {
      setExpression(selectedExpression);
      const evalRes = evaluateExpression(selectedExpression, angleMode);
      setResult(evalRes.formatted);
      onClearSelected?.();
    }
  }, [selectedExpression, angleMode, onClearSelected]);

  useEffect(() => {
    if (selectedResult !== undefined && selectedResult !== "") {
      setExpression((prev) => {
        if (
          prev === "" ||
          prev === "0" ||
          ["+", "−", "×", "÷", "(", "^"].some((op) => prev.endsWith(op))
        ) {
          return prev + selectedResult;
        }
        return selectedResult;
      });
      setResult(selectedResult);
      onClearSelected?.();
    }
  }, [selectedResult, onClearSelected]);

  // Real-time preview calculation
  useEffect(() => {
    if (!expression || expression.trim() === "") {
      setPreview("");
      return;
    }

    // Only preview if it looks like an expression (contains numbers/ops)
    if (/[+\-×÷^%!()]/.test(expression)) {
      const evalRes = evaluateExpression(expression, angleMode);
      if (!evalRes.error && evalRes.formatted !== "Error") {
        setPreview(evalRes.formatted);
      } else {
        setPreview("");
      }
    } else {
      setPreview("");
    }
  }, [expression, angleMode]);

  // Scroll expression to end on change
  useEffect(() => {
    if (expressionRef.current) {
      expressionRef.current.scrollLeft = expressionRef.current.scrollWidth;
    }
  }, [expression]);

  // Input Handling
  const handleAppend = useCallback((val: string) => {
    sounds.playClick("num");
    setExpression((prev) => {
      // If previous was Error, reset
      if (prev === "Error" || prev === "Cannot divide by 0") {
        return val;
      }
      return prev + val;
    });
  }, []);

  const handleAppendOperator = useCallback((op: string) => {
    sounds.playClick("op");
    setExpression((prev) => {
      if (prev === "" || prev === "Error") {
        // If empty and op is minus, allow negative
        if (op === "−") return "−";
        return "";
      }
      // If ending with operator, replace it
      const lastChar = prev.slice(-1);
      if (["+", "−", "×", "÷", "%", "^"].includes(lastChar)) {
        return prev.slice(0, -1) + op;
      }
      return prev + op;
    });
  }, []);

  const handleClear = useCallback(() => {
    sounds.playClick("clear");
    setExpression("");
    setResult("0");
    setPreview("");
  }, []);

  const handleBackspace = useCallback(() => {
    sounds.playClick("num");
    setExpression((prev) => {
      if (prev.length <= 1 || prev === "Error") return "";
      // Handle special functions like sin( or cos(
      for (const fn of [
        "asin(",
        "acos(",
        "atan(",
        "sqrt(",
        "cbrt(",
        "sin(",
        "cos(",
        "tan(",
        "log(",
        "ln(",
      ]) {
        if (prev.endsWith(fn)) {
          return prev.slice(0, -fn.length);
        }
      }
      return prev.slice(0, -1);
    });
  }, []);

  const handleToggleSign = useCallback(() => {
    sounds.playClick("op");
    setExpression((prev) => {
      if (!prev || prev === "0") return "-";
      if (prev.startsWith("-")) return prev.slice(1);
      return "-" + prev;
    });
  }, []);

  // Compute and Save to SQLite
  const handleEvaluate = useCallback(async () => {
    if (!expression || expression.trim() === "") return;

    sounds.playClick("equal");
    const evalRes = evaluateExpression(expression, angleMode);
    setResult(evalRes.formatted);
    setPreview("");

    if (evalRes.formatted !== "Error" && evalRes.formatted !== "Cannot divide by 0") {
      try {
        const res = await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expression,
            result: evalRes.formatted,
            mode,
          }),
        });
        const data = await res.json();
        if (data.success && data.calculation) {
          onCalculationSaved(data.calculation);
        }
      } catch (err) {
        console.error("Failed to save calculation to SQLite:", err);
      }
    }
  }, [expression, angleMode, mode, onCalculationSaved]);

  // Memory functions
  const handleMemoryClear = async () => {
    sounds.playClick("clear");
    await saveMemoryToDb(0);
    showToast("Memory Cleared (M = 0)");
  };

  const handleMemoryRecall = () => {
    sounds.playClick("num");
    handleAppend(memoryVal.toString());
    showToast(`Recalled M = ${memoryVal}`);
  };

  const handleMemoryAdd = async () => {
    sounds.playClick("op");
    const currentNum = Number(result) || Number(preview) || 0;
    const newVal = memoryVal + currentNum;
    await saveMemoryToDb(newVal);
    showToast(`Added to Memory: M = ${newVal}`);
  };

  const handleMemorySubtract = async () => {
    sounds.playClick("op");
    const currentNum = Number(result) || Number(preview) || 0;
    const newVal = memoryVal - currentNum;
    await saveMemoryToDb(newVal);
    showToast(`Subtracted from Memory: M = ${newVal}`);
  };

  const handleMemoryStore = async () => {
    sounds.playClick("op");
    const currentNum = Number(result) || Number(preview) || 0;
    await saveMemoryToDb(currentNum);
    showToast(`Stored in Memory: M = ${currentNum}`);
  };

  // Copy result to clipboard
  const handleCopyResult = () => {
    navigator.clipboard.writeText(result);
    showToast(`Copied "${result}" to clipboard!`);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key;

      // Visual highlight helper
      setActiveKey(key);
      setTimeout(() => setActiveKey(null), 120);

      if (key >= "0" && key <= "9") {
        e.preventDefault();
        handleAppend(key);
      } else if (key === ".") {
        e.preventDefault();
        handleAppend(".");
      } else if (key === "+") {
        e.preventDefault();
        handleAppendOperator("+");
      } else if (key === "-") {
        e.preventDefault();
        handleAppendOperator("−");
      } else if (key === "*") {
        e.preventDefault();
        handleAppendOperator("×");
      } else if (key === "/") {
        e.preventDefault();
        handleAppendOperator("÷");
      } else if (key === "%") {
        e.preventDefault();
        handleAppendOperator("%");
      } else if (key === "^") {
        e.preventDefault();
        handleAppendOperator("^");
      } else if (key === "(" || key === ")") {
        e.preventDefault();
        handleAppend(key);
      } else if (key === "!") {
        e.preventDefault();
        handleAppend("!");
      } else if (key === "Enter" || key === "=") {
        e.preventDefault();
        handleEvaluate();
      } else if (key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (key === "Escape") {
        e.preventDefault();
        handleClear();
      } else if (key.toLowerCase() === "s" && mode === "scientific") {
        e.preventDefault();
        handleAppend("sin(");
      } else if (key.toLowerCase() === "c" && mode === "scientific") {
        e.preventDefault();
        handleAppend("cos(");
      } else if (key.toLowerCase() === "t" && mode === "scientific") {
        e.preventDefault();
        handleAppend("tan(");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleAppend,
    handleAppendOperator,
    handleEvaluate,
    handleBackspace,
    handleClear,
    mode,
  ]);

  return (
    <div className="calculator-card" role="region" aria-label="Calculator Device">
      {/* Top Mode Bar */}
      <div className="mode-bar">
        <div className="pill-group">
          <button
            className={`pill-btn ${mode === "standard" ? "active" : ""}`}
            onClick={() => setMode("standard")}
          >
            Standard
          </button>
          <button
            className={`pill-btn ${mode === "scientific" ? "active" : ""}`}
            onClick={() => setMode("scientific")}
          >
            Scientific
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {mode === "scientific" && (
            <button
              className="angle-btn"
              onClick={() =>
                setAngleMode((prev) => (prev === "DEG" ? "RAD" : "DEG"))
              }
              title="Toggle Degree / Radian"
            >
              <span>📐</span>
              <span>{angleMode}</span>
            </button>
          )}

          <button
            className="icon-btn"
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? "Mute audio clicks" : "Unmute audio clicks"}
            aria-label="Toggle audio feedback"
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
        </div>
      </div>

      {/* Screen Display */}
      <div className="calc-screen">
        <div className="screen-header">
          <div className="screen-indicators">
            <span className="indicator-badge">{mode.toUpperCase()}</span>
            {mode === "scientific" && (
              <span className="indicator-badge">{angleMode}</span>
            )}
            {memoryVal !== 0 && (
              <span className="indicator-badge active-mem">
                M ({memoryVal})
              </span>
            )}
          </div>

          <div className="screen-actions">
            <button
              className="icon-btn"
              onClick={handleCopyResult}
              title="Copy result"
              aria-label="Copy result"
            >
              📋
            </button>
            <button
              className="icon-btn"
              onClick={handleClear}
              title="Clear screen (Esc)"
              aria-label="Clear screen"
            >
              ↺
            </button>
          </div>
        </div>

        <div className="screen-body">
          <div className="expression-line" ref={expressionRef}>
            {expression || <span style={{ color: "var(--text-dim)" }}>0</span>}
          </div>

          <div
            className="result-line"
            onClick={handleCopyResult}
            title="Click to copy result"
          >
            {result}
          </div>

          <div className="preview-line">
            {preview && preview !== result ? `≈ ${preview}` : ""}
          </div>
        </div>
      </div>

      {/* Memory Function Row */}
      <div className="memory-row">
        <button className="mem-btn" onClick={handleMemoryClear} title="Memory Clear">
          MC
        </button>
        <button className="mem-btn" onClick={handleMemoryRecall} title="Memory Recall">
          MR
        </button>
        <button className="mem-btn" onClick={handleMemoryAdd} title="Memory Add">
          M+
        </button>
        <button className="mem-btn" onClick={handleMemorySubtract} title="Memory Subtract">
          M−
        </button>
        <button className="mem-btn" onClick={handleMemoryStore} title="Memory Store">
          MS
        </button>
      </div>

      {/* Scientific Sub-Grid (Visible when in Scientific Mode) */}
      {mode === "scientific" && (
        <div className="scientific-grid">
          <button className="calc-btn btn-func" onClick={() => handleAppend("sin(")}>
            sin
          </button>
          <button className="calc-btn btn-func" onClick={() => handleAppend("cos(")}>
            cos
          </button>
          <button className="calc-btn btn-func" onClick={() => handleAppend("tan(")}>
            tan
          </button>
          <button className="calc-btn btn-func" onClick={() => handleAppend("π")}>
            π
          </button>
          <button className="calc-btn btn-func" onClick={() => handleAppend("e")}>
            e
          </button>

          <button className="calc-btn btn-func" onClick={() => handleAppend("asin(")}>
            asin
          </button>
          <button className="calc-btn btn-func" onClick={() => handleAppend("acos(")}>
            acos
          </button>
          <button className="calc-btn btn-func" onClick={() => handleAppend("atan(")}>
            atan
          </button>
          <button className="calc-btn btn-func" onClick={() => handleAppend("sqrt(")}>
            √x
          </button>
          <button className="calc-btn btn-func" onClick={() => handleAppend("^2")}>
            x²
          </button>

          <button className="calc-btn btn-func" onClick={() => handleAppend("ln(")}>
            ln
          </button>
          <button className="calc-btn btn-func" onClick={() => handleAppend("log(")}>
            log
          </button>
          <button className="calc-btn btn-func" onClick={() => handleAppend("^")}>
            xʸ
          </button>
          <button className="calc-btn btn-func" onClick={() => handleAppend("!")}>
            n!
          </button>
          <button className="calc-btn btn-func" onClick={() => handleAppend("(1/")}>
            1/x
          </button>
        </div>
      )}

      {/* Standard Keypad Grid */}
      <div className="keypad-grid">
        {/* Row 1 */}
        <button
          className={`calc-btn btn-clear ${activeKey === "Escape" ? "btn-pressed" : ""}`}
          onClick={handleClear}
        >
          AC
          <span className="key-hint">Esc</span>
        </button>
        <button
          className={`calc-btn btn-clear ${activeKey === "Backspace" ? "btn-pressed" : ""}`}
          onClick={handleBackspace}
        >
          ⌫
          <span className="key-hint">Del</span>
        </button>
        <button
          className={`calc-btn btn-op ${activeKey === "%" ? "btn-pressed" : ""}`}
          onClick={() => handleAppendOperator("%")}
        >
          %
        </button>
        <button
          className={`calc-btn btn-op ${activeKey === "/" ? "btn-pressed" : ""}`}
          onClick={() => handleAppendOperator("÷")}
        >
          ÷
          <span className="key-hint">/</span>
        </button>

        {/* Row 2 */}
        <button
          className={`calc-btn btn-num ${activeKey === "7" ? "btn-pressed" : ""}`}
          onClick={() => handleAppend("7")}
        >
          7
        </button>
        <button
          className={`calc-btn btn-num ${activeKey === "8" ? "btn-pressed" : ""}`}
          onClick={() => handleAppend("8")}
        >
          8
        </button>
        <button
          className={`calc-btn btn-num ${activeKey === "9" ? "btn-pressed" : ""}`}
          onClick={() => handleAppend("9")}
        >
          9
        </button>
        <button
          className={`calc-btn btn-op ${activeKey === "*" ? "btn-pressed" : ""}`}
          onClick={() => handleAppendOperator("×")}
        >
          ×
          <span className="key-hint">*</span>
        </button>

        {/* Row 3 */}
        <button
          className={`calc-btn btn-num ${activeKey === "4" ? "btn-pressed" : ""}`}
          onClick={() => handleAppend("4")}
        >
          4
        </button>
        <button
          className={`calc-btn btn-num ${activeKey === "5" ? "btn-pressed" : ""}`}
          onClick={() => handleAppend("5")}
        >
          5
        </button>
        <button
          className={`calc-btn btn-num ${activeKey === "6" ? "btn-pressed" : ""}`}
          onClick={() => handleAppend("6")}
        >
          6
        </button>
        <button
          className={`calc-btn btn-op ${activeKey === "-" ? "btn-pressed" : ""}`}
          onClick={() => handleAppendOperator("−")}
        >
          −
          <span className="key-hint">-</span>
        </button>

        {/* Row 4 */}
        <button
          className={`calc-btn btn-num ${activeKey === "1" ? "btn-pressed" : ""}`}
          onClick={() => handleAppend("1")}
        >
          1
        </button>
        <button
          className={`calc-btn btn-num ${activeKey === "2" ? "btn-pressed" : ""}`}
          onClick={() => handleAppend("2")}
        >
          2
        </button>
        <button
          className={`calc-btn btn-num ${activeKey === "3" ? "btn-pressed" : ""}`}
          onClick={() => handleAppend("3")}
        >
          3
        </button>
        <button
          className={`calc-btn btn-op ${activeKey === "+" ? "btn-pressed" : ""}`}
          onClick={() => handleAppendOperator("+")}
        >
          +
        </button>

        {/* Row 5 */}
        <button className="calc-btn btn-op" onClick={handleToggleSign}>
          ±
        </button>
        <button
          className={`calc-btn btn-num ${activeKey === "0" ? "btn-pressed" : ""}`}
          onClick={() => handleAppend("0")}
        >
          0
        </button>
        <button
          className={`calc-btn btn-num ${activeKey === "." ? "btn-pressed" : ""}`}
          onClick={() => handleAppend(".")}
        >
          .
        </button>
        <button
          className={`calc-btn btn-equal ${activeKey === "Enter" || activeKey === "=" ? "btn-pressed" : ""}`}
          onClick={handleEvaluate}
        >
          =
          <span className="key-hint">↵</span>
        </button>
      </div>
    </div>
  );
};
