"use client";

import React, { useState } from "react";
import { CalculationRecord } from "@/lib/db";

interface HistorySidebarProps {
  history: CalculationRecord[];
  onSelectExpression: (expr: string) => void;
  onSelectResult: (result: string) => void;
  onToggleFavorite: (id: number) => void;
  onUpdateNote: (id: number, note: string) => void;
  onDelete: (id: number) => void;
  onClearAll: () => void;
  onClose?: () => void;
  stats: {
    total: number;
    favorites: number;
    standardCount: number;
    scientificCount: number;
  };
  isLoading: boolean;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  history,
  onSelectExpression,
  onSelectResult,
  onToggleFavorite,
  onUpdateNote,
  onDelete,
  onClearAll,
  onClose,
  stats,
  isLoading,
}) => {
  const [filter, setFilter] = useState<"all" | "favorites" | "standard" | "scientific">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Filter calculations
  const filteredHistory = history.filter((item) => {
    if (filter === "favorites" && !item.is_favorite) return false;
    if (filter === "standard" && item.mode !== "standard") return false;
    if (filter === "scientific" && item.mode !== "scientific") return false;

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchExpr = item.expression.toLowerCase().includes(term);
      const matchRes = item.result.toLowerCase().includes(term);
      const matchNote = (item.note || "").toLowerCase().includes(term);
      return matchExpr || matchRes || matchNote;
    }
    return true;
  });

  const handleStartEditNote = (item: CalculationRecord) => {
    setEditingNoteId(item.id);
    setNoteDraft(item.note || "");
  };

  const handleSaveNote = (id: number) => {
    onUpdateNote(id, noteDraft);
    setEditingNoteId(null);
  };

  const handleExport = (format: "json" | "csv") => {
    window.open(`/api/export?format=${format}`, "_blank");
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="history-card" aria-label="Calculation History">
      {/* Header */}
      <div className="history-header">
        <div className="history-title">
          <span>📜</span>
          <span>SQLite Ledger</span>
          <span className="sqlite-badge">
            <span className="sqlite-dot"></span>
            Sync Active
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="icon-btn"
            title="Close drawer"
            aria-label="Close drawer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Database Quick Stats */}
      <div className="history-stats-bar">
        <div className="stat-box">
          <span className="stat-label">Calculations</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Starred</span>
          <span className="stat-value" style={{ color: "#fbbf24" }}>
            {stats.favorites}
          </span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Scientific</span>
          <span className="stat-value" style={{ color: "#38bdf8" }}>
            {stats.scientificCount}
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="history-controls">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search expressions, results, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="icon-btn"
              style={{ position: "absolute", right: "0.5rem" }}
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-pills">
          <button
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All ({history.length})
          </button>
          <button
            className={`filter-btn ${filter === "favorites" ? "active" : ""}`}
            onClick={() => setFilter("favorites")}
          >
            ⭐ Starred ({stats.favorites})
          </button>
          <button
            className={`filter-btn ${filter === "standard" ? "active" : ""}`}
            onClick={() => setFilter("standard")}
          >
            Standard ({stats.standardCount})
          </button>
          <button
            className={`filter-btn ${filter === "scientific" ? "active" : ""}`}
            onClick={() => setFilter("scientific")}
          >
            Scientific ({stats.scientificCount})
          </button>
        </div>
      </div>

      {/* History Items List */}
      <div className="history-list">
        {isLoading && history.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">⏳</span>
            <p>Loading database records...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📂</span>
            <p>No calculation records found</p>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
              Calculations are automatically saved to SQLite
            </span>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div key={item.id} className="history-item">
              <div className="history-item-top">
                <div className="history-meta">
                  <span className="badge-mode">{item.mode}</span>
                  <span>{formatTime(item.created_at)}</span>
                </div>
                <button
                  className={`history-action-btn ${item.is_favorite ? "fav-active" : ""}`}
                  onClick={() => onToggleFavorite(item.id)}
                  title={item.is_favorite ? "Remove from favorites" : "Add to favorites"}
                  aria-label="Toggle favorite"
                >
                  {item.is_favorite ? "⭐" : "☆"}
                </button>
              </div>

              {/* Click to reuse */}
              <div
                className="history-item-calc"
                onClick={() => onSelectResult(item.result)}
                title="Click to insert result into calculator"
              >
                <span className="history-item-expr">{item.expression} =</span>
                <span className="history-item-res">{item.result}</span>
              </div>

              {/* Note display / edit */}
              {editingNoteId === item.id ? (
                <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.3rem" }}>
                  <input
                    type="text"
                    className="search-input"
                    style={{ padding: "0.3rem 0.5rem", fontSize: "0.8rem" }}
                    value={noteDraft}
                    placeholder="Enter label (e.g. Tax, Salary)..."
                    onChange={(e) => setNoteDraft(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveNote(item.id);
                      if (e.key === "Escape") setEditingNoteId(null);
                    }}
                  />
                  <button
                    className="nav-btn active"
                    style={{ padding: "0.2rem 0.6rem" }}
                    onClick={() => handleSaveNote(item.id)}
                  >
                    Save
                  </button>
                  <button
                    className="nav-btn"
                    style={{ padding: "0.2rem 0.4rem" }}
                    onClick={() => setEditingNoteId(null)}
                  >
                    ✕
                  </button>
                </div>
              ) : item.note ? (
                <div
                  className="history-item-note"
                  onClick={() => handleStartEditNote(item)}
                  title="Click to edit note"
                >
                  🏷️ {item.note}
                </div>
              ) : null}

              {/* Action buttons */}
              <div className="history-item-actions">
                <button
                  className="history-action-btn"
                  onClick={() => onSelectExpression(item.expression)}
                  title="Load full formula into expression"
                >
                  ↩ Formula
                </button>
                <button
                  className="history-action-btn"
                  onClick={() => onSelectResult(item.result)}
                  title="Load result"
                >
                  ⇥ Result
                </button>
                <button
                  className="history-action-btn"
                  onClick={() => handleStartEditNote(item)}
                  title="Add or edit note"
                >
                  ✎ Note
                </button>
                <button
                  className="history-action-btn delete"
                  onClick={() => onDelete(item.id)}
                  title="Delete from SQLite database"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* History Footer Actions */}
      <div className="history-footer">
        <div className="export-group">
          <button
            className="nav-btn"
            onClick={() => handleExport("csv")}
            title="Export SQLite records as CSV"
          >
            ⬇ CSV
          </button>
          <button
            className="nav-btn"
            onClick={() => handleExport("json")}
            title="Export SQLite records as JSON"
          >
            ⬇ JSON
          </button>
        </div>

        {history.length > 0 && (
          <button
            className="clear-history-btn"
            onClick={() => setConfirmClearOpen(true)}
          >
            Clear Ledger
          </button>
        )}
      </div>

      {/* Clear Confirmation Modal */}
      {confirmClearOpen && (
        <div className="modal-overlay" onClick={() => setConfirmClearOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Clear Calculation History?</h3>
              <button
                className="icon-btn"
                onClick={() => setConfirmClearOpen(false)}
              >
                ✕
              </button>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              This will permanently delete all {history.length} calculation records from
              the local SQLite database (<code>data/calculator.db</code>). This action cannot
              be undone.
            </p>
            <div className="modal-footer">
              <button
                className="nav-btn"
                onClick={() => setConfirmClearOpen(false)}
              >
                Cancel
              </button>
              <button
                className="clear-history-btn"
                style={{ background: "#e11d48", color: "white" }}
                onClick={() => {
                  onClearAll();
                  setConfirmClearOpen(false);
                }}
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
