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
  const priceFormatted = article.price ? `$${(article.price * 100).toFixed(0)}` : '$299';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2B2B]/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-[#FAF8F4] border border-[#ECE8E2] rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/80 border border-[#ECE8E2] text-[#2B2B2B] hover:bg-[#2B2B2B] hover:text-white flex items-center justify-center text-sm font-bold transition-all shadow-sm"
        >
          ✕
        </button>

        {/* Product Image / Metadata */}
        <div className="w-full md:w-1/2 aspect-square md:aspect-auto bg-[#F3EFE8] relative overflow-hidden flex items-center justify-center p-6">
          <img
            src={displayImage}
            alt={article.title}
            className="w-full h-full object-cover rounded-[24px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2B2B2B]/80 via-transparent to-transparent p-6 flex flex-col justify-between text-white z-10">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#5E7656] bg-white/90 backdrop-blur-md px-3 py-1 rounded-full border border-[#ECE8E2] shadow-sm">
                {article.department || 'Fashion'}
              </span>
              <span className="text-xs font-mono bg-[#2B2B2B]/80 backdrop-blur-md px-2.5 py-1 rounded-full text-white border border-white/10">
                ID: {article.article_id}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#5E7656] text-white">
                  {article.category}
                </span>
                {article.color && article.color !== 'Multi' && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/90 text-[#2B2B2B] border border-[#ECE8E2]">
                    🎨 {article.color}
                  </span>
                )}
              </div>
              <h2 className="font-serif-luxury text-3xl font-bold mt-2 leading-tight drop-shadow-md">{article.title}</h2>
              <p className="text-2xl font-black text-white mt-1">{priceFormatted}</p>
            </div>
          </div>
        </div>

        {/* Modal Info & Tabs */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto space-y-5 bg-[#FAF8F4]">
          <div className="space-y-4">
            
            {/* Explanation Box */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#777777]">AI Explanation</span>
              <div className="flex items-center gap-2.5 mt-1 bg-white border border-[#ECE8E2] p-3.5 rounded-[20px] shadow-sm">
                <span className="text-[#5E7656] text-lg">✨</span>
                <p className="text-xs text-[#2B2B2B] font-medium leading-relaxed">
                  {article.reason || 'Recommended based on your session style preferences'}
                </p>
              </div>
            </div>

            {/* Recommendation Tabs */}
            <div>
              <div className="flex items-center gap-2 border-b border-[#ECE8E2] pb-2 mb-3">
                <button
                  onClick={() => setTab('similar')}
                  className={`text-xs font-bold px-4 py-2 rounded-full transition-all ${
                    tab === 'similar'
                      ? 'bg-[#5E7656] text-white shadow'
                      : 'text-[#777777] hover:text-[#2B2B2B] bg-[#F3EFE8]'
                  }`}
                >
                  👟 Similar {article.category}
                </button>
                <button
                  onClick={() => setTab('bundle')}
                  className={`text-xs font-bold px-4 py-2 rounded-full transition-all ${
                    tab === 'bundle'
                      ? 'bg-[#2B2B2B] text-white shadow'
                      : 'text-[#777777] hover:text-[#2B2B2B] bg-[#F3EFE8]'
                  }`}
                >
                  🛍️ Outfit Bundle
                </button>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="h-24 bg-[#F3EFE8] rounded-[18px] animate-pulse"></div>
                  <div className="h-24 bg-[#F3EFE8] rounded-[18px] animate-pulse"></div>
                </div>
              ) : recommendations.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {recommendations.map((item) => (
                    <div
                      key={item.article_id}
                      onClick={() => onSelectArticle(item)}
                      className="p-3 bg-white hover:bg-[#F3EFE8] rounded-[18px] border border-[#ECE8E2] cursor-pointer transition-all flex flex-col justify-between group shadow-sm"
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-[12px] bg-[#F3EFE8] mb-2 relative">
                        <img
                          src={getProductImage(item)}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <span className="text-[10px] text-[#5E7656] font-semibold">{item.category}</span>
                      <p className="font-serif-luxury text-sm font-bold text-[#2B2B2B] line-clamp-1">{item.title}</p>
                      <span className="text-xs font-bold text-[#2B2B2B] mt-1">${(item.price * 100).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#777777]">No matching items found for this mode.</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#ECE8E2] flex items-center justify-between">
            <button
              onClick={() => {
                if (onAddToCart) onAddToCart(article);
                onClose();
              }}
              className="px-6 py-2.5 text-xs font-bold rounded-full bg-[#5E7656] hover:bg-[#4d6246] text-white shadow-md transition-all flex items-center gap-2 active:scale-95"
            >
              <span>🛒</span>
              <span>Add to Cart</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold rounded-full bg-[#F3EFE8] hover:bg-[#ECE8E2] text-[#2B2B2B] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
