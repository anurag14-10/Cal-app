"use client";

import React from "react";

interface DbInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    total: number;
    favorites: number;
    standardCount: number;
    scientificCount: number;
  };
}

export const DbInfoModal: React.FC<DbInfoModalProps> = ({
  isOpen,
  onClose,
  stats,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1.4rem" }}>🗄️</span>
            <div>
              <h3 className="modal-title">SQLite Database Diagnostics</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Local Embedded Database Engine
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            style={{
              background: "var(--bg-canvas)",
              padding: "0.85rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Driver:</span>
              <span style={{ color: "#34d399", fontWeight: 600 }}>JSON Ledger Engine</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Storage Engine:</span>
              <span style={{ color: "var(--text-primary)" }}>SQLite 3 (WAL Mode)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>File Location:</span>
              <span style={{ color: "#a5b4fc" }}>./data/calculator.db</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>ACID Compliance:</span>
              <span style={{ color: "#38bdf8" }}>Full Transactions</span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
            }}
          >
            <div className="stat-box">
              <span className="stat-label">Total History</span>
              <span className="stat-value">{stats.total}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Favorites</span>
              <span className="stat-value" style={{ color: "#fbbf24" }}>
                {stats.favorites}
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Standard Ops</span>
              <span className="stat-value">{stats.standardCount}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Scientific Ops</span>
              <span className="stat-value" style={{ color: "#38bdf8" }}>
                {stats.scientificCount}
              </span>
            </div>
          </div>

          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            <p>
              Every operation you perform is committed to SQLite with high-speed WAL
              logging. You can review past calculations, star key equations, annotate with
              labels, or export your tape anytime.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="nav-btn active" onClick={onClose}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
