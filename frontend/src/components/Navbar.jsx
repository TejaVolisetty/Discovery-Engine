import React from 'react';

export default function Navbar({
  sessionId,
  consent,
  onConsentToggle,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onResetSession
}) {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 flex-shrink-0 cursor-pointer" onClick={onResetSession}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-[2px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="text-xl">✨</span>
            </div>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              Discovery<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Engine</span>
            </h1>
            <p className="text-[10px] text-slate-400 -mt-1 font-medium tracking-wider uppercase">Multi-Intent Recommendations</p>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={onSearchSubmit} className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by style, category, or trend (e.g. 'summer dress')..."
              className="w-full bg-slate-900/90 text-slate-100 placeholder-slate-500 text-sm rounded-full pl-10 pr-10 py-2 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
            />
            <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </form>

        {/* DPDP Consent & Session Controls */}
        <div className="flex items-center gap-3">
          {/* Consent Toggle Switch */}
          <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-full border border-slate-800">
            <span className="text-xs text-slate-300 font-medium hidden sm:inline">Personalization:</span>
            <button
              onClick={onConsentToggle}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                consent ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
              title={consent ? 'Personalization Consent Granted (DPDP compliant)' : 'Consent Revoked - Popularity Fallback Mode'}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  consent ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-[11px] font-bold ${consent ? 'text-indigo-400' : 'text-amber-400'}`}>
              {consent ? 'ON' : 'OFF (Fallback)'}
            </span>
          </div>

          {/* Active Session Badge */}
          <div
            onClick={onResetSession}
            title="Click to reset session"
            className="hidden lg:flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-full border border-slate-800 text-xs font-mono cursor-pointer transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{sessionId ? `${sessionId.slice(0, 10)}...` : 'Session Active'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
