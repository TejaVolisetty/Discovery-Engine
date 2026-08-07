import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ProductCard, { getProductImage } from '../components/ProductCard';
import ProductDetailModal from '../components/ProductDetailModal';
import { getSessionId, fetchHomeRecommendations, logEvent, searchArticles } from '../services/api';
import axios from 'axios';

export default function HomeFeed() {
  const [sessionId, setSessionId] = useState(getSessionId());
  const [consent, setConsent] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Interaction & Order detection state
  const [eventCount, setEventCount] = useState(0);
  const [lastEventMsg, setLastEventMsg] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [recentOrderArticle, setRecentOrderArticle] = useState(null);
  const [similarOrderRecs, setSimilarOrderRecs] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  const categories = ['All', 'Tops', 'Dresses', 'Outerwear', 'Shoes', 'Accessories', 'Knitwear'];

  const loadFeed = async (overrideSessionId = sessionId, overrideConsent = consent) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHomeRecommendations(overrideSessionId, overrideConsent, 20);
      if (data && data.recommendations) {
        setRecommendations(data.recommendations);
      } else {
        setError('Unable to load recommendation data.');
      }
    } catch (err) {
      setError('Could not connect to recommendation engine backend.');
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

  // Add to Cart Handler & Automatic Visual/Title Similar Detection Engine
  const handleAddToCart = async (article) => {
    setCartItems((prev) => [article, ...prev]);
    setRecentOrderArticle(article);
    handleRecordEvent(article, 'cart');

    // Trigger AI Model Detection for Similar Images & Product Names
    setLoadingSimilar(true);
    try {
      // 1. Fetch strict category & color matched vector similarity for this item
      const res = await axios.get(`http://localhost:8000/recommendations/complete-the-look/${article.article_id}?mode=similar&limit=6`);
      let similar = res.data && res.data.complementary_items ? res.data.complementary_items : [];

      // 2. If additional search results needed, run query matching title/category
      if (similar.length < 4) {
        const searchRes = await searchArticles(article.category || article.title, sessionId, consent, 6);
        if (searchRes && searchRes.results) {
          const newResults = searchRes.results.filter(r => r.article_id !== article.article_id);
          similar = [...similar, ...newResults].slice(0, 6);
        }
      }

      setSimilarOrderRecs(similar);
      setLastEventMsg(`🛒 Added "${article.title}" to Cart! AI Model automatically detected ${similar.length} visually & title-matched items.`);
    } catch (err) {
      console.warn('Similar detection error:', err);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleCardClick = (article) => {
    setSelectedArticle(article);
    handleRecordEvent(article, 'click');
  };

  const handleHoverLong = (article) => {
    handleRecordEvent(article, 'hover');
  };

  const handleConsentToggle = () => {
    const nextConsent = !consent;
    setConsent(nextConsent);
  };

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setIsSearching(false);
      loadFeed(sessionId, consent);
      return;
    }

    setLoading(true);
    setError(null);
    setIsSearching(true);
    try {
      const searchRes = await searchArticles(searchQuery, sessionId, consent, 20);
      if (searchRes && searchRes.results) {
        setRecommendations(searchRes.results);
      }
    } catch (err) {
      setError('Search service unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = () => {
    localStorage.removeItem('discovery_session_id');
    const newSession = getSessionId();
    setSessionId(newSession);
    setEventCount(0);
    setLastEventMsg(null);
    setSearchQuery('');
    setIsSearching(false);
    setCartItems([]);
    setRecentOrderArticle(null);
    setSimilarOrderRecs([]);
  };

  const filteredRecs = activeCategory === 'All'
    ? recommendations
    : recommendations.filter((r) => r.category.toLowerCase().includes(activeCategory.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Navbar
        sessionId={sessionId}
        consent={consent}
        onConsentToggle={handleConsentToggle}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        onResetSession={handleResetSession}
        cartCount={cartItems.length}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Hero Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 text-indigo-400 text-xs font-semibold border border-indigo-500/30 mb-3">
              <span>🚀 Two-Tower + PyTorch ResNet18 Visual Vector Search Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              {isSearching ? `Search Results for "${searchQuery}"` : 'Personalized Fashion Discovery'}
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
              Real-time multi-intent recommendations powered by FAISS visual vector similarity, cart item auto-detection, and 35% diversity caps.
            </p>
          </div>

          {/* Real-Time Session & Cart Tracker */}
          <div className="flex items-center gap-3 sm:gap-4 bg-slate-900/80 p-3 sm:p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-300 shadow-lg">
            <div className="flex flex-col">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Cart Orders</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-black text-amber-400">🛒 {cartItems.length}</span>
              </div>
            </div>
            <div className="h-8 w-[1px] bg-slate-800"></div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Events</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-black text-indigo-400">{eventCount}</span>
                <span className="text-[10px] text-slate-500">({eventCount % 5}/5)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Interaction Toast */}
        {lastEventMsg && (
          <div className="bg-gradient-to-r from-indigo-950/90 via-purple-950/80 to-slate-900 border border-indigo-500/40 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between shadow-xl animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="text-xl sm:text-2xl">⚡</span>
              <p className="text-xs text-indigo-200 font-medium leading-snug">
                {lastEventMsg}
              </p>
            </div>
            <button
              onClick={() => setLastEventMsg(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* AUTOMATIC SIMILAR PRODUCT DETECTION CAROUSEL FOR RECENT CART ITEMS */}
        {recentOrderArticle && (
          <section className="bg-slate-900/90 border border-indigo-500/40 rounded-3xl p-5 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🤖</span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    AI Auto-Detected Similar Products Based on Recent Order:
                    <span className="text-indigo-400 font-extrabold underline">{recentOrderArticle.title}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    FAISS PyTorch ResNet18 Visual Vector Matcher detected matching styles & complementary titles:
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRecentOrderArticle(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
              >
                Dismiss
              </button>
            </div>

            {loadingSimilar ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-28 bg-slate-800/60 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : similarOrderRecs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {similarOrderRecs.map((item) => (
                  <div
                    key={item.article_id}
                    onClick={() => handleCardClick(item)}
                    className="group bg-slate-950 p-2.5 rounded-xl border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-slate-900 relative">
                      <img
                        src={getProductImage(item)}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                        {item.score ? `${(item.score * 100).toFixed(0)}%` : 'Vector Match'}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-[10px] text-indigo-400 font-semibold">{item.category}</span>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{item.title}</h4>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs font-extrabold text-slate-200">${(item.price * 100).toFixed(2)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddToCart(item); }}
                          className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                        >
                          + Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Searching for visual vector matches...</p>
            )}
          </section>
        )}

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 scale-105'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Error State Banner */}
        {error && (
          <div className="p-4 bg-red-950/60 border border-red-500/40 rounded-2xl flex items-center justify-between text-red-200 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadFeed()}
              className="px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white font-semibold text-xs"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Product Grid (Responsive down to 375px) */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-slate-900/60 rounded-2xl p-4 h-80 animate-pulse border border-slate-800/60 flex flex-col justify-between">
                <div className="w-full h-48 bg-slate-800/60 rounded-xl"></div>
                <div className="space-y-2 mt-4">
                  <div className="h-4 bg-slate-800/60 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-800/60 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRecs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredRecs.map((article) => (
              <ProductCard
                key={article.article_id}
                article={article}
                onClick={handleCardClick}
                onAddToCart={handleAddToCart}
                onHoverLong={handleHoverLong}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-6 max-w-lg mx-auto space-y-4">
            <span className="text-5xl block">🛍️</span>
            <h3 className="text-xl font-bold text-white">No products found in this category</h3>
            <p className="text-slate-400 text-xs sm:text-sm">
              We couldn't find matching articles for <span className="font-semibold text-indigo-400">"{activeCategory}"</span> in your current feed window.
            </p>
            <button
              onClick={() => { setActiveCategory('All'); setSearchQuery(''); setIsSearching(false); loadFeed(); }}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30"
            >
              View All Recommendations
            </button>
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedArticle && (
        <ProductDetailModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onAddToCart={(art) => {
            handleAddToCart(art);
          }}
          onSelectArticle={(newArt) => {
            setSelectedArticle(newArt);
            handleRecordEvent(newArt, 'click');
          }}
        />
      )}
    </div>
  );
}
