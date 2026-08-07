import React, { useState, useRef } from 'react';

// Extensive photo library with zero duplicates per category
const categoryPhotos = {
  Shoes: [
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518049362265-d5b2a6467637?w=600&auto=format&fit=crop&q=80'
  ],
  Jackets: [
    'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544441893-675973e31985?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=600&auto=format&fit=crop&q=80'
  ],
  Outerwear: [
    'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&auto=format&fit=crop&q=80'
  ],
  Dresses: [
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=600&auto=format&fit=crop&q=80'
  ],
  Tops: [
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=600&auto=format&fit=crop&q=80'
  ],
  Trousers: [
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542272604-780c36856842?w=600&auto=format&fit=crop&q=80'
  ],
  Knitwear: [
    'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600&auto=format&fit=crop&q=80'
  ],
  Accessories: [
    'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509319117193-57bab727e09d?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1611591475281-b1e970274296?w=600&auto=format&fit=crop&q=80'
  ]
};

export function getProductImage(article) {
  if (article.image_url && article.image_url.startsWith('http')) {
    return article.image_url;
  }

  const cat = article.category || 'Tops';
  const photos = categoryPhotos[cat] || categoryPhotos['Tops'];
  
  // Use numeric article_id to pick a unique photo for every card
  const cleanId = String(article.article_id || '0').replace(/\D/g, '') || '0';
  const photoIndex = Math.abs(parseInt(cleanId, 10)) % photos.length;
  
  return photos[photoIndex];
}

export default function ProductCard({ article, onClick, onAddToCart, onHoverLong }) {
  const [imageError, setImageError] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const hoverTimerRef = useRef(null);

  const handleClick = (e) => {
    e.stopPropagation();
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);
    if (onClick) {
      onClick(article);
    }
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(article);
    }
  };

  const handleMouseEnter = () => {
    hoverTimerRef.current = setTimeout(() => {
      if (onHoverLong) {
        onHoverLong(article);
      }
    }, 1000);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const displayImage = imageError ? getProductImage(article) : (article.image_url && article.image_url.startsWith('http') ? article.image_url : getProductImage(article));

  return (
    <div
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative flex flex-col bg-slate-900/80 backdrop-blur-md rounded-2xl overflow-hidden border border-slate-800 hover:border-indigo-500/50 shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 transform hover:-translate-y-1.5 cursor-pointer ${
        isClicked ? 'scale-95 ring-2 ring-indigo-500' : ''
      }`}
    >
      {/* Image container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950">
        <img
          src={displayImage}
          alt={article.title}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Category & Color Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-slate-950/80 backdrop-blur-md text-indigo-300 border border-indigo-500/30 shadow-md">
            {article.category || 'Apparel'}
          </span>
          {article.color && article.color !== 'Multi' && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-950/90 text-amber-300 border border-amber-500/30">
              🎨 {article.color}
            </span>
          )}
        </div>

        {/* Match Score Badge */}
        {article.score && (
          <div className="absolute top-3 right-3 z-10">
            <span className="px-2 py-1 text-[11px] font-bold rounded-md bg-emerald-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30">
              {(article.score * 100).toFixed(0)}% Match
            </span>
          </div>
        )}

        {/* Hover Explainability Reason Caption Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-20 flex items-center gap-2">
          <span className="text-amber-400 text-sm flex-shrink-0">✨</span>
          <p className="text-xs text-slate-200 font-medium leading-tight">
            {article.reason || 'Recommended based on your session style'}
          </p>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-4 flex flex-col justify-between flex-grow">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1">
            {article.title}
          </h3>
          <div className="flex items-center justify-between mt-1 text-xs text-slate-400">
            <span className="line-clamp-1">{article.department || article.category}</span>
            {article.garment_group && (
              <span className="text-[10px] text-slate-500 flex-shrink-0 font-mono">{article.garment_group}</span>
            )}
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-base font-bold text-white">
            ${(article.price * 100).toFixed(2)}
          </span>
          <button
            onClick={handleAddToCart}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>🛒</span>
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}
