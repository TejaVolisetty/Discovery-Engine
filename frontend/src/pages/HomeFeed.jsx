import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import ProductCard, { getProductImage } from '../components/ProductCard';
import ProductDetailModal from '../components/ProductDetailModal';
import { getHomeRecommendations, searchArticles, logEvent } from '../services/api';

export default function HomeFeed() {
  const [sessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 10));
  const [consent, setConsent] = useState(true);
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [eventCount, setEventCount] = useState(0);
  const [lastEventMsg, setLastEventMsg] = useState('');
  const [recentOrderArticle, setRecentOrderArticle] = useState(null);
  const [similarItems, setSimilarItems] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Load initial luxury recommendations
  const loadFeed = async (sessId, consentVal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHomeRecommendations(sessId, consentVal, 16);
      if (data && data.recommendations) {
        setFeedItems(data.recommendations);
      } else {
        setFeedItems([]);
      }
    } catch (err) {
      console.error('Failed to load home recommendations:', err);
      setError('Unable to load luxury collection. Please ensure the backend service is active.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed(sessionId, consent);
  }, [sessionId, consent]);

  // Event recording for clicks, hovers, and cart adds
  const handleRecordEvent = async (article, eventType) => {
    await logEvent(sessionId, article.article_id, eventType, consent);

    setEventCount((prev) => {
      const newCount = prev + 1;
      setLastEventMsg(`Logged ${eventType.toUpperCase()} event on "${article.title}" (Total: ${newCount})`);

      if (newCount % 5 === 0 && consent) {
        setLastEventMsg(`🎉 5 interactions recorded! Feed automatically re-ranked with updated session context.`);
        loadFeed(sessionId, consent);
      }
      return newCount;
    });
  };

  // Add to Cart Handler & Automatic Visual Similar Detection Engine
  const handleAddToCart = async (article) => {
    setCartItems((prev) => [article, ...prev]);
    setRecentOrderArticle(article);
    handleRecordEvent(article, 'cart');

    setLoadingSimilar(true);
    try {
      const res = await axios.get(`http://localhost:8000/recommendations/complete-the-look/${article.article_id}?mode=similar&limit=4`);
      if (res.data && res.data.complementary_items) {
        setSimilarItems(res.data.complementary_items);
      }
    } catch (err) {
      console.warn('Similar detection fetch error:', err);
    } finally {
      setLoadingSimilar(false);
    }
  };

  // Search Submit Handler
  const handleSearchSubmit = async (query) => {
    if (!query.trim()) {
      loadFeed(sessionId, consent);
      return;
    }
    setLoading(true);
    try {
      const res = await searchArticles(query, sessionId, consent, 16);
      if (res && res.results) {
        setFeedItems(res.results);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#2B2B2B] font-sans selection:bg-[#5E7656] selection:text-white pb-16">
      
      {/* 1. Floating Pill Navigation */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        cartCount={cartItems.length}
        consent={consent}
        onToggleConsent={() => setConsent(!consent)}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Main Container - Aligned to 1440px */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-24 mt-6">

        {/* 2. Hero Section (Split Layout) */}
        <section className="relative rounded-[36px] bg-[#F3EFE8]/70 border border-[#ECE8E2] overflow-hidden p-8 md:p-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center luxury-shadow">
          
          {/* Left Text Content */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#5E7656]"></span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#5E7656]">
                NEW COLLECTION
              </span>
            </div>

            <h1 className="font-serif-luxury text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] text-[#2B2B2B]">
              Designed For <br />
              <span className="italic font-normal">Extraordinary</span> Living
            </h1>

            <p className="text-sm md:text-base text-[#777777] max-w-lg leading-relaxed font-normal">
              Premium products crafted for modern lifestyles with exceptional quality, natural materials, and timeless architectural design.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <a
                href="#featured"
                className="px-8 py-3.5 rounded-full bg-[#5E7656] hover:bg-[#4d6246] text-white text-xs font-bold tracking-wider uppercase transition-all shadow-md flex items-center gap-2 group"
              >
                <span>Shop Collection</span>
                <span className="group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform">↗</span>
              </a>

              <button
                onClick={() => {
                  if (feedItems.length > 0) setSelectedArticle(feedItems[0]);
                }}
                className="px-7 py-3.5 rounded-full bg-white hover:bg-[#FAF8F4] text-[#2B2B2B] text-xs font-bold tracking-wider uppercase transition-all border border-[#ECE8E2] shadow-sm flex items-center gap-2"
              >
                <span>Discover More</span>
                <span className="text-[10px]">▶</span>
              </button>
            </div>

            {/* Vertical Pagination Dots */}
            <div className="pt-6 flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-[#2B2B2B]">01</span>
              <div className="w-8 h-[2px] bg-[#2B2B2B]"></div>
              <div className="w-2 h-2 rounded-full bg-[#ECE8E2]"></div>
              <div className="w-2 h-2 rounded-full bg-[#ECE8E2]"></div>
              <div className="w-2 h-2 rounded-full bg-[#ECE8E2]"></div>
            </div>
          </div>

          {/* Right Hero Image Composition */}
          <div className="lg:col-span-6 relative aspect-[4/3] lg:aspect-[5/4] rounded-[28px] overflow-hidden bg-white border border-[#ECE8E2] luxury-shadow">
            <img
              src="https://images.unsplash.com/photo-1544816155-12df9643f363?w=1200&auto=format&fit=crop&q=85"
              alt="Haven Hero Luxury Lifestyle Composition"
              className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-1000"
            />
            {/* Subtle Overlay Badge */}
            <div className="absolute bottom-6 right-6 luxury-glass px-5 py-3 rounded-2xl border border-white/40 shadow-lg hidden sm:flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5E7656] text-white flex items-center justify-center text-lg font-bold">
                🍃
              </div>
              <div>
                <p className="text-xs font-bold text-[#2B2B2B]">Crafted with Intent</p>
                <p className="text-[10px] text-[#777777]">100% Sustainable Organic Materials</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Features Row (5 Premium Cards) */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { title: 'Sustainable', desc: 'Better for you and the planet', icon: '🌱' },
            { title: 'Premium Quality', desc: 'Finest materials and craftsmanship', icon: '✨' },
            { title: 'Free Shipping', desc: 'Complimentary delivery worldwide', icon: '🚚' },
            { title: 'Exclusive Access', desc: 'Early access to limited editions', icon: '🔒' },
            { title: 'Secure Payment', desc: 'Multiple secure payment options', icon: '🛍️' }
          ].map((feat, idx) => (
            <div
              key={idx}
              className="bg-white rounded-[24px] p-5 border border-[#ECE8E2] luxury-shadow flex flex-col justify-between space-y-3 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#F3EFE8] flex items-center justify-center text-lg">
                {feat.icon}
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#2B2B2B] uppercase tracking-wider">{feat.title}</h4>
                <p className="text-[11px] text-[#777777] mt-1 leading-snug">{feat.desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* 4. Featured Collection ("Curated For You") */}
        <section id="featured" className="space-y-8">
          
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#5E7656]">
                FEATURED COLLECTION
              </span>
              <h2 className="font-serif-luxury text-4xl sm:text-5xl font-bold text-[#2B2B2B] mt-1">
                Curated For You <span className="text-[#5E7656] font-normal">+</span>
              </h2>
              <p className="text-xs sm:text-sm text-[#777777] mt-1">
                Handpicked products for your elevated lifestyle, continuously personalized by AI.
              </p>
            </div>

            <a
              href="#collections"
              className="text-xs font-bold tracking-wider text-[#2B2B2B] hover:text-[#5E7656] flex items-center gap-1.5 transition-colors uppercase"
            >
              <span>Explore Collection</span>
              <span>➔</span>
            </a>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-80 bg-[#F3EFE8] rounded-[24px] animate-pulse"></div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center bg-white rounded-[24px] border border-[#ECE8E2] text-rose-600 text-sm font-semibold">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {feedItems.slice(0, 8).map((article) => (
                <ProductCard
                  key={article.article_id}
                  article={article}
                  onClick={(art) => {
                    setSelectedArticle(art);
                    handleRecordEvent(art, 'click');
                  }}
                  onAddToCart={handleAddToCart}
                  onHoverLong={(art) => handleRecordEvent(art, 'hover')}
                />
              ))}
            </div>
          )}
        </section>

        {/* 5. Lifestyle Banner ("A Lifestyle Of Excellence") */}
        <section id="lifestyle" className="relative rounded-[36px] overflow-hidden min-h-[480px] flex items-center luxury-shadow border border-[#ECE8E2]">
          <img
            src="https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1600&auto=format&fit=crop&q=85"
            alt="Haven Lifestyle Banner"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#2B2B2B]/85 via-[#2B2B2B]/40 to-transparent"></div>

          <div className="relative z-10 p-8 sm:p-16 max-w-xl text-white space-y-5">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
              BEYOND PRODUCTS
            </span>
            <h2 className="font-serif-luxury text-4xl sm:text-5xl font-bold leading-tight">
              A Lifestyle <br />
              <span className="italic font-normal">Of Excellence</span>
            </h2>
            <p className="text-sm text-slate-200 leading-relaxed font-light">
              We believe in creating more than products. We craft experiences that elevate your everyday moments into something extraordinary.
            </p>
            <button
              onClick={() => {
                if (feedItems.length > 1) setSelectedArticle(feedItems[1]);
              }}
              className="px-7 py-3 rounded-full bg-white hover:bg-[#FAF8F4] text-[#2B2B2B] text-xs font-bold tracking-wider uppercase transition-all shadow-md flex items-center gap-2"
            >
              <span>Discover Our Story</span>
              <span>➔</span>
            </button>
          </div>

          {/* Floating Promotional Glass Card on Right */}
          <div className="absolute right-8 bottom-8 luxury-glass rounded-[28px] p-6 max-w-xs border border-white/40 shadow-2xl hidden lg:block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#5E7656]">NEW COLLECTION</span>
            <h3 className="font-serif-luxury text-2xl font-bold text-[#2B2B2B] mt-1">Earth & Elements</h3>
            <p className="text-xs text-[#777777] mt-1">Inspired by nature, designed for the modern world.</p>
            <button
              onClick={() => {
                if (feedItems.length > 2) setSelectedArticle(feedItems[2]);
              }}
              className="mt-4 text-xs font-bold text-[#2B2B2B] hover:text-[#5E7656] flex items-center gap-1 transition-colors"
            >
              <span>Explore Now</span>
              <span>➔</span>
            </button>
          </div>
        </section>

        {/* 6. Collection Cards Section (3 Magazine Cards) */}
        <section id="collections" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="group relative rounded-[28px] bg-white border border-[#ECE8E2] p-6 flex flex-col justify-between overflow-hidden luxury-shadow luxury-shadow-hover">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#777777]">NEW ARRIVALS</span>
              <h3 className="font-serif-luxury text-3xl font-bold text-[#2B2B2B] mt-1">Fresh Picks</h3>
              <p className="text-xs text-[#777777] mt-1">Discover the latest additions to our collection.</p>
            </div>
            <div className="my-6 aspect-[4/3] rounded-[20px] overflow-hidden bg-[#F3EFE8]">
              <img
                src="https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=600&auto=format&fit=crop&q=80"
                alt="Fresh Picks"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </div>
            <a href="#featured" className="text-xs font-bold text-[#2B2B2B] group-hover:text-[#5E7656] flex items-center gap-1.5 transition-colors uppercase">
              <span>Shop Now</span>
              <span>➔</span>
            </a>
          </div>

          {/* Card 2 */}
          <div className="group relative rounded-[28px] bg-[#F3EFE8] border border-[#ECE8E2] p-6 flex flex-col justify-between overflow-hidden luxury-shadow luxury-shadow-hover">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#5E7656]">EDITOR'S PICKS</span>
              <h3 className="font-serif-luxury text-3xl font-bold text-[#2B2B2B] mt-1">Our Favorites</h3>
              <p className="text-xs text-[#777777] mt-1">Handpicked by our editors just for you.</p>
            </div>
            <div className="my-6 aspect-[4/3] rounded-[20px] overflow-hidden bg-white">
              <img
                src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&auto=format&fit=crop&q=80"
                alt="Our Favorites"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </div>
            <a href="#featured" className="text-xs font-bold text-[#2B2B2B] group-hover:text-[#5E7656] flex items-center gap-1.5 transition-colors uppercase">
              <span>Explore Picks</span>
              <span>➔</span>
            </a>
          </div>

          {/* Card 3 */}
          <div className="group relative rounded-[28px] bg-[#2B2B2B] text-white p-6 flex flex-col justify-between overflow-hidden luxury-shadow luxury-shadow-hover">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">MEMBERSHIP</span>
              <h3 className="font-serif-luxury text-3xl font-bold mt-1">Haven Exclusive</h3>
              <p className="text-xs text-slate-300 mt-1">Unlock member benefits, exclusive offers and more.</p>
            </div>
            <div className="my-6 aspect-[4/3] rounded-[20px] overflow-hidden bg-emerald-950/60 p-6 flex flex-col justify-between border border-emerald-500/30">
              <div className="flex justify-between items-start">
                <span className="font-serif-luxury text-lg font-bold tracking-wider">HAVEN</span>
                <span className="text-[10px] font-mono text-emerald-300">MEMBER</span>
              </div>
              <p className="text-xs font-mono tracking-widest text-slate-400">•••• •••• •••• 8842</p>
            </div>
            <a href="#footer" className="text-xs font-bold text-white group-hover:text-emerald-300 flex items-center gap-1.5 transition-colors uppercase">
              <span>Join Now</span>
              <span>➔</span>
            </a>
          </div>
        </section>

        {/* 7. Newsletter Section ("Stay Inspired") */}
        <section className="rounded-[36px] bg-white border border-[#ECE8E2] p-8 md:p-14 luxury-shadow grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-6 space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-[#5E7656]">NEWSLETTER</span>
            <h2 className="font-serif-luxury text-4xl font-bold text-[#2B2B2B]">Stay Inspired</h2>
            <p className="text-xs sm:text-sm text-[#777777] max-w-md">
              Subscribe to our newsletter and be the first to discover new collections, editorial stories, and exclusive offers.
            </p>

            <div className="pt-2 flex items-center max-w-md">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-5 py-3 text-xs bg-[#F3EFE8] border border-[#ECE8E2] rounded-l-full text-[#2B2B2B] placeholder-[#777777] focus:outline-none focus:ring-1 focus:ring-[#5E7656]"
              />
              <button className="px-6 py-3 bg-[#5E7656] hover:bg-[#4d6246] text-white text-xs font-bold rounded-r-full transition-colors flex items-center justify-center">
                ➔
              </button>
            </div>
          </div>

          {/* Instagram Photography Grid */}
          <div className="lg:col-span-6 grid grid-cols-5 gap-2">
            {[
              'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=300&auto=format&fit=crop&q=80',
              'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=300&auto=format&fit=crop&q=80',
              'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&auto=format&fit=crop&q=80',
              'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&auto=format&fit=crop&q=80',
              'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=300&auto=format&fit=crop&q=80'
            ].map((img, i) => (
              <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-[#F3EFE8]">
                <img src={img} alt="Haven Lifestyle" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 8. Premium Footer */}
      <footer id="footer" className="max-w-[1440px] mx-auto px-6 md:px-8 mt-24 pt-16 border-t border-[#ECE8E2] text-xs text-[#777777]">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12">
          
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#5E7656] text-white flex items-center justify-center">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 3v18m0-18C8 3 4 7 4 12s4 9 8 9m0-18c4 0 8 4 8 9s-4 9-8 9" />
                </svg>
              </div>
              <span className="font-serif-luxury text-xl font-bold tracking-wider text-[#2B2B2B] uppercase">HAVEN</span>
            </div>
            <p className="text-xs text-[#777777] max-w-xs leading-relaxed">
              Elevating everyday living through timeless design, natural materials, and AI-powered personalized discovery.
            </p>
          </div>

          <div>
            <h5 className="font-bold text-[#2B2B2B] uppercase tracking-wider mb-3">SHOP</h5>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-[#2B2B2B]">All Products</a></li>
              <li><a href="#" className="hover:text-[#2B2B2B]">New Arrivals</a></li>
              <li><a href="#" className="hover:text-[#2B2B2B]">Best Sellers</a></li>
              <li><a href="#" className="hover:text-[#2B2B2B]">Collections</a></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-[#2B2B2B] uppercase tracking-wider mb-3">COMPANY</h5>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-[#2B2B2B]">About Us</a></li>
              <li><a href="#" className="hover:text-[#2B2B2B]">Our Story</a></li>
              <li><a href="#" className="hover:text-[#2B2B2B]">Sustainability</a></li>
              <li><a href="#" className="hover:text-[#2B2B2B]">Careers</a></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-[#2B2B2B] uppercase tracking-wider mb-3">SUPPORT</h5>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-[#2B2B2B]">Help Center</a></li>
              <li><a href="#" className="hover:text-[#2B2B2B]">Shipping & Returns</a></li>
              <li><a href="#" className="hover:text-[#2B2B2B]">Track Order</a></li>
              <li><a href="#" className="hover:text-[#2B2B2B]">Contact Us</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#ECE8E2] flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 HAVEN Inc. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-white rounded border border-[#ECE8E2] font-mono text-[10px]"> Pay</span>
            <span className="px-2.5 py-1 bg-white rounded border border-[#ECE8E2] font-mono text-[10px]">G Pay</span>
            <span className="px-2.5 py-1 bg-white rounded border border-[#ECE8E2] font-mono text-[10px]">VISA</span>
            <span className="px-2.5 py-1 bg-white rounded border border-[#ECE8E2] font-mono text-[10px]">MC</span>
          </div>
        </div>
      </footer>

      {/* Product Detail Modal */}
      {selectedArticle && (
        <ProductDetailModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onAddToCart={handleAddToCart}
          onSelectArticle={(art) => setSelectedArticle(art)}
        />
      )}

      {/* Cart Slideout Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#2B2B2B]/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#FAF8F4] h-full p-6 flex flex-col justify-between border-l border-[#ECE8E2] shadow-2xl">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-[#ECE8E2]">
                <h3 className="font-serif-luxury text-2xl font-bold text-[#2B2B2B]">Your Bag ({cartItems.length})</h3>
                <button onClick={() => setIsCartOpen(false)} className="text-[#2B2B2B] text-lg font-bold">✕</button>
              </div>

              {cartItems.length === 0 ? (
                <p className="text-xs text-[#777777] mt-8 text-center">Your shopping bag is empty.</p>
              ) : (
                <div className="mt-4 space-y-3 overflow-y-auto max-h-[60vh]">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-2xl border border-[#ECE8E2] flex items-center gap-3">
                      <img src={getProductImage(item)} alt={item.title} className="w-14 h-14 object-cover rounded-xl bg-[#F3EFE8]" />
                      <div className="flex-grow">
                        <p className="font-serif-luxury text-sm font-bold text-[#2B2B2B] line-clamp-1">{item.title}</p>
                        <p className="text-xs font-bold text-[#5E7656]">${(item.price * 100).toFixed(0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#ECE8E2]">
              <button onClick={() => setIsCartOpen(false)} className="w-full py-3 bg-[#5E7656] text-white text-xs font-bold rounded-full uppercase shadow">
                Checkout
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
