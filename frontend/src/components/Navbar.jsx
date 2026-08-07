import React, { useState } from 'react';

export default function Navbar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  cartCount,
  consent,
  onToggleConsent,
  onOpenCart
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearchSubmit) {
      onSearchSubmit(searchQuery);
    }
  };

  return (
    <header className="sticky top-4 z-40 px-4 md:px-8 max-w-[1440px] mx-auto transition-all preserve-3d">
      <nav className="luxury-glass-3d rounded-full px-6 py-3.5 flex items-center justify-between shadow-xl border border-[#ECE8E2] transform hover:translate-y-[-2px] transition-transform duration-300">
        
        {/* Brand Logo & Icon */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-full bg-[#5E7656] text-white flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 3v18m0-18C8 3 4 7 4 12s4 9 8 9m0-18c4 0 8 4 8 9s-4 9-8 9" />
            </svg>
          </div>
          <span className="font-serif-luxury text-2xl font-bold tracking-wider text-[#2B2B2B] uppercase">
            HAVEN
          </span>
        </a>

        {/* Center Navigation Links */}
        <div className="hidden lg:flex items-center gap-8 text-xs font-semibold tracking-wider text-[#777777] uppercase">
          <a href="#featured" className="hover:text-[#2B2B2B] transition-colors flex items-center gap-1">
            Shop <span className="text-[9px]">▼</span>
          </a>
          <a href="#collections" className="hover:text-[#2B2B2B] transition-colors">Collections</a>
          <a href="#new-arrivals" className="hover:text-[#2B2B2B] transition-colors">New Arrivals</a>
          <a href="#lifestyle" className="hover:text-[#2B2B2B] transition-colors">Stories</a>
          <a href="#footer" className="hover:text-[#2B2B2B] transition-colors">About</a>
        </div>

        {/* Right Search, Actions & DPDP Privacy Toggle */}
        <div className="flex items-center gap-3 md:gap-4">
          
          {/* Search Input Bar with ⌘ K */}
          <div className="relative hidden sm:flex items-center">
            <input
              type="text"
              placeholder="Search anything..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-44 md:w-56 pl-9 pr-8 py-1.5 text-xs bg-[#F3EFE8]/80 border border-[#ECE8E2] rounded-full text-[#2B2B2B] placeholder-[#777777] focus:outline-none focus:ring-1 focus:ring-[#5E7656] transition-all shadow-inner"
            />
            <svg className="w-3.5 h-3.5 absolute left-3 text-[#777777]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="absolute right-2.5 px-1.5 py-0.5 text-[9px] font-mono font-medium text-[#777777] bg-white rounded border border-[#ECE8E2] shadow-sm">
              ⌘ K
            </span>
          </div>

          {/* Privacy Consent Badge */}
          <button
            onClick={onToggleConsent}
            title={consent ? "Personalization Active (DPDP Compliant)" : "Consent Revoked (Generic Mode)"}
            className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all flex items-center gap-1 shadow-sm ${
              consent
                ? "bg-[#5E7656]/10 text-[#5E7656] border-[#5E7656]/30"
                : "bg-[#777777]/10 text-[#777777] border-[#777777]/30"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${consent ? "bg-[#5E7656]" : "bg-[#777777]"}`}></span>
            <span className="hidden md:inline">{consent ? "Personalized" : "Generic"}</span>
          </button>

          {/* Wishlist Icon */}
          <button className="p-2 text-[#2B2B2B] hover:text-[#5E7656] hover:scale-110 transition-all relative" title="Wishlist">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          {/* Cart Icon with Badge */}
          <button
            onClick={onOpenCart}
            className="p-2 text-[#2B2B2B] hover:text-[#5E7656] hover:scale-110 transition-all relative flex items-center justify-center"
            title="View Bag"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#5E7656] text-white text-[9px] font-extrabold flex items-center justify-center shadow-md animate-bounce">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>
    </header>
  );
}
