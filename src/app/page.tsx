"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Calculator } from "@/components/Calculator";
import { HistorySidebar } from "@/components/HistorySidebar";
import { DbInfoModal } from "@/components/DbInfoModal";
import { CalculationRecord } from "@/lib/db";

interface Toast {
  id: number;
  message: string;
}

export default function Home() {
  const [history, setHistory] = useState<CalculationRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    favorites: 0,
    standardCount: 0,
    scientificCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isDbInfoOpen, setIsDbInfoOpen] = useState(false);
  const [selectedExpression, setSelectedExpression] = useState<string>("");
  const [selectedResult, setSelectedResult] = useState<string>("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast notifications helper
  const showToast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // Fetch initial history
  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const [histRes, statsRes] = await Promise.all([
        fetch("/api/history"),
        fetch("/api/stats"),
      ]);

      const histData = await histRes.json();
      const statsData = await statsRes.json();

      if (histData.success && Array.isArray(histData.calculations)) {
        setHistory(histData.calculations);
      }
      if (statsData.success && statsData.stats) {
        setStats(statsData.stats);
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
      showToast("Could not connect to SQLite database");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Handlers
  const handleCalculationSaved = useCallback(
    (calc: CalculationRecord) => {
      setHistory((prev) => [calc, ...prev]);
      setStats((prev) => ({
        ...prev,
        total: prev.total + 1,
        favorites: calc.is_favorite ? prev.favorites + 1 : prev.favorites,
        standardCount:
          calc.mode === "standard" ? prev.standardCount + 1 : prev.standardCount,
        scientificCount:
          calc.mode === "scientific" ? prev.scientificCount + 1 : prev.scientificCount,
      }));
    },
    []
  );

  const handleToggleFavorite = async (id: number) => {
    // Optimistic update
    setHistory((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, is_favorite: item.is_favorite ? 0 : 1 } : item
      )
    );

    try {
      const res = await fetch(`/api/history/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_favorite" }),
      });
      const data = await res.json();
      if (data.success && data.calculation) {
        setHistory((prev) =>
          prev.map((item) => (item.id === id ? data.calculation : item))
        );
        // Refresh stats
        fetch("/api/stats")
          .then((r) => r.json())
          .then((st) => st.stats && setStats(st.stats));
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
      showToast("Error updating favorite in database");
    }
  };

  const handleUpdateNote = async (id: number, note: string) => {
    // Optimistic update
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note } : item))
    );

    try {
      const res = await fetch(`/api/history/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Note saved to SQLite");
      }
    } catch (err) {
      console.error("Failed to update note:", err);
      showToast("Error saving note to database");
    }
  };

  const handleDelete = async (id: number) => {
    // Optimistic update
    setHistory((prev) => prev.filter((item) => item.id !== id));

    try {
      const res = await fetch(`/api/history/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast("Entry removed from SQLite");
        fetch("/api/stats")
          .then((r) => r.json())
          .then((st) => st.stats && setStats(st.stats));
      }
    } catch (err) {
      console.error("Failed to delete entry:", err);
      showToast("Error deleting entry");
    }
  };

  const handleClearAll = async () => {
    setHistory([]);
    setStats({
      total: 0,
      favorites: 0,
      standardCount: 0,
      scientificCount: 0,
    });

    try {
      const res = await fetch("/api/history", {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast("Ledger completely cleared from SQLite");
      }
    } catch (err) {
      console.error("Failed to clear history:", err);
      showToast("Error clearing history");
    }
  };

  return (
    <div className="app-container">
      {/* Top Header / Navigation */}
      <header className="navbar">
        <div className="brand-wrapper">
          <div className="brand-icon">∑</div>
          <div className="brand-text">
            <h1>OmniCalc Pro</h1>
            <div className="brand-subtitle">
              <span>Scientific Engine</span>
              <button
                className="sqlite-badge"
                onClick={() => setIsDbInfoOpen(true)}
                title="Click for SQLite DB status"
                style={{ cursor: "pointer", border: "none" }}
              >
                <span className="sqlite-dot"></span>
                SQLite Active
              </button>
            </div>
          </div>
        </div>

        <nav className="nav-actions">
          <button
            className="nav-btn"
            onClick={() => setIsDbInfoOpen(true)}
            title="Inspect SQLite Database"
          >
            🗄️ Database
          </button>

          <button
            className={`nav-btn ${showSidebar ? "active" : ""}`}
            onClick={() => setShowSidebar((prev) => !prev)}
            title="Toggle Calculation History Ledger"
          >
            📜 Ledger
            <span className="nav-badge">{history.length}</span>
          </button>
        </nav>
      </header>

      {/* Main Workspace Layout */}
      <main
        className={`workspace-grid ${showSidebar ? "with-sidebar" : ""}`}
        role="main"
      >
        {/* Calculator Terminal */}
        <Calculator
          onCalculationSaved={handleCalculationSaved}
          selectedExpression={selectedExpression}
          selectedResult={selectedResult}
          onClearSelected={() => {
            setSelectedExpression("");
            setSelectedResult("");
          }}
          showToast={showToast}
        />

        {/* History Ledger Sidebar */}
        {showSidebar && (
          <HistorySidebar
            history={history}
            onSelectExpression={(expr) => setSelectedExpression(expr)}
            onSelectResult={(res) => setSelectedResult(res)}
            onToggleFavorite={handleToggleFavorite}
            onUpdateNote={handleUpdateNote}
            onDelete={handleDelete}
            onClearAll={handleClearAll}
            onClose={() => setShowSidebar(false)}
            stats={stats}
            isLoading={isLoading}
          />
        )}
      </main>

      {/* Diagnostics / DB Modal */}
      <DbInfoModal
        isOpen={isDbInfoOpen}
        onClose={() => setIsDbInfoOpen(false)}
        stats={stats}
      />

      {/* Floating Toast Alerts */}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span>✨</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
