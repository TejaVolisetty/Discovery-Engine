import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getProductImage } from './ProductCard';

export default function ProductDetailModal({ article, onClose, onAddToCart, onSelectArticle }) {
  const [recommendations, setRecommendations] = useState([]);
  const [tab, setTab] = useState('similar'); // 'similar' or 'bundle'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!article) return;
    setLoading(true);

    const fetchRecs = async () => {
      try {
        const mode = tab === 'similar' ? 'similar' : 'complete';
        const res = await axios.get(`http://localhost:8000/recommendations/complete-the-look/${article.article_id}?mode=${mode}&limit=4`);
        if (res.data && res.data.complementary_items) {
          setRecommendations(res.data.complementary_items);
        }
      } catch (err) {
        console.warn('Recommendation modal fetch warning:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecs();
  }, [article, tab]);

  if (!article) return null;

  const displayImage = getProductImage(article);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
        >
          ✕
        </button>

        {/* Product Image / Metadata */}
        <div className="w-full md:w-1/2 aspect-square md:aspect-auto bg-slate-950 relative overflow-hidden flex items-center justify-center">
          <img
            src={displayImage}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-6 flex flex-col justify-between text-white z-10">
            <div className="flex justify-between items-start">
              <span className="text-xs uppercase font-bold tracking-widest text-indigo-300 bg-slate-950/80 px-2.5 py-1 rounded-full border border-indigo-500/30">
                {article.department || 'Fashion'}
              </span>
              <span className="text-xs font-mono bg-slate-950/80 px-2 py-1 rounded border border-slate-800">ID: {article.article_id}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-600/80 text-white">
                  {article.category}
                </span>
                {article.color && article.color !== 'Multi' && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/30">
                    🎨 {article.color}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black mt-2 leading-tight drop-shadow-md">{article.title}</h2>
              <p className="text-xl font-black text-emerald-400 mt-2">${(article.price * 100).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Modal Info & Tabs */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto space-y-5">
          <div className="space-y-4">
            {/* Explanation */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Recommendation Explanation</span>
              <div className="flex items-center gap-2 mt-1 bg-indigo-950/60 border border-indigo-500/30 p-3 rounded-xl">
                <span className="text-amber-400 text-lg">✨</span>
                <p className="text-xs text-indigo-200 font-medium">{article.reason || 'Recommended based on session attributes'}</p>
              </div>
            </div>

            {/* Recommendation Modes Tab Header */}
            <div>
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
                <button
                  onClick={() => setTab('similar')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                    tab === 'similar'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-800/50'
                  }`}
                >
                  👟 Similar {article.category}
                </button>
                <button
                  onClick={() => setTab('bundle')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                    tab === 'bundle'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-800/50'
                  }`}
                >
                  🛍️ Outfit Bundle
                </button>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-24 bg-slate-800/50 rounded-xl animate-pulse"></div>
                  <div className="h-24 bg-slate-800/50 rounded-xl animate-pulse"></div>
                </div>
              ) : recommendations.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {recommendations.map((item) => (
                    <div
                      key={item.article_id}
                      onClick={() => onSelectArticle(item)}
                      className="p-2.5 bg-slate-800/60 hover:bg-indigo-950/80 rounded-xl border border-slate-700/60 hover:border-indigo-500/40 cursor-pointer transition-all flex flex-col justify-between group"
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-950 mb-1.5 relative">
                        <img
                          src={getProductImage(item)}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        {item.color && (
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-950/90 text-amber-300">
                            {item.color}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-indigo-400 font-semibold">{item.category}</span>
                      <p className="text-xs font-bold text-white line-clamp-1">{item.title}</p>
                      <span className="text-[11px] font-extrabold text-emerald-400 mt-1">${(item.price * 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No matching items found for this mode.</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => {
                if (onAddToCart) onAddToCart(article);
                onClose();
              }}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>🛒</span>
              <span>Add to Cart</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
