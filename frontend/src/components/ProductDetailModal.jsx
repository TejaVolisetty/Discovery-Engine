import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function ProductDetailModal({ article, onClose, onSelectArticle }) {
  const [completeTheLook, setCompleteTheLook] = useState([]);
  const [loadingCTL, setLoadingCTL] = useState(true);

  useEffect(() => {
    if (!article) return;
    setLoadingCTL(true);

    const fetchCTL = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/recommendations/complete-the-look/${article.article_id}?limit=4`);
        if (res.data && res.data.complementary_items) {
          setCompleteTheLook(res.data.complementary_items);
        }
      } catch (err) {
        console.warn('Complete the look fetch warning:', err);
      } finally {
        setLoadingCTL(false);
      }
    };

    fetchCTL();
  }, [article]);

  if (!article) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
        >
          ✕
        </button>

        {/* Product Image / Gradient */}
        <div className="w-full md:w-1/2 aspect-square md:aspect-auto bg-slate-950 relative flex items-center justify-center">
          <div className="w-full h-full bg-gradient-to-br from-indigo-700 via-purple-700 to-slate-900 p-8 flex flex-col justify-between text-white">
            <div className="flex justify-between items-start">
              <span className="text-xs uppercase font-bold tracking-widest text-indigo-200">{article.department || 'Fashion'}</span>
              <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded">ID: {article.article_id}</span>
            </div>
            <div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30">
                {article.category}
              </span>
              <h2 className="text-2xl font-black mt-2 leading-tight">{article.title}</h2>
              <p className="text-lg font-bold text-emerald-300 mt-2">${(article.price * 100).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Modal Info & Complete The Look Bundle */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Recommendation Explanation</span>
              <div className="flex items-center gap-2 mt-1 bg-indigo-950/60 border border-indigo-500/30 p-3 rounded-xl">
                <span className="text-amber-400 text-lg">✨</span>
                <p className="text-xs text-indigo-200 font-medium">{article.reason}</p>
              </div>
            </div>

            {/* Complete The Look Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Complete The Look Bundle</span>
                <span className="text-[10px] text-slate-500">Co-purchased items</span>
              </div>

              {loadingCTL ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-20 bg-slate-800/50 rounded-xl animate-pulse"></div>
                  <div className="h-20 bg-slate-800/50 rounded-xl animate-pulse"></div>
                </div>
              ) : completeTheLook.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {completeTheLook.map((item) => (
                    <div
                      key={item.article_id}
                      onClick={() => onSelectArticle(item)}
                      className="p-2.5 bg-slate-800/60 hover:bg-indigo-950/80 rounded-xl border border-slate-700/60 hover:border-indigo-500/40 cursor-pointer transition-all flex flex-col justify-between"
                    >
                      <span className="text-[10px] text-indigo-400 font-semibold">{item.category}</span>
                      <p className="text-xs font-bold text-white line-clamp-1 mt-0.5">{item.title}</p>
                      <span className="text-[11px] font-bold text-slate-300 mt-1">${(item.price * 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No complementary items available for this article.</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
