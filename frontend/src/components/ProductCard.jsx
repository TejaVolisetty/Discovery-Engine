import React, { useState, useRef } from 'react';

export function getProductImage(article) {
  if (article.image_url && article.image_url.startsWith('http')) {
    return article.image_url;
  }
  
  const categoryColorImages = {
    // SHOES / FOOTWEAR
    'Shoes_Black': [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=600&auto=format&fit=crop&q=80'
    ],
    'Shoes_White': [
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80'
    ],
    'Shoes_Red': [
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=600&auto=format&fit=crop&q=80'
    ],
    'Shoes_Default': [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80'
    ],

    // JACKETS / OUTERWEAR
    'Jackets_Black': [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600&auto=format&fit=crop&q=80'
    ],
    'Jackets_Blue': [
      'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=80'
    ],
    'Jackets_Default': [
      'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80'
    ],
    'Outerwear_Default': [
      'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80'
    ],

    // DRESSES
    'Dresses_Red': [
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&auto=format&fit=crop&q=80'
    ],
    'Dresses_Black': [
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&auto=format&fit=crop&q=80'
    ],
    'Dresses_Default': [
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80'
    ],

    // TOPS
    'Tops_White': [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&auto=format&fit=crop&q=80'
    ],
    'Tops_Black': [
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&auto=format&fit=crop&q=80'
    ],
    'Tops_Default': [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80'
    ],

    // TROUSERS
    'Trousers_Blue': [
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600&auto=format&fit=crop&q=80'
    ],
    'Trousers_Black': [
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600&auto=format&fit=crop&q=80'
    ],
    'Trousers_Default': [
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80'
    ],

    // KNITWEAR
    'Knitwear_Default': [
      'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&auto=format&fit=crop&q=80'
    ],

    // ACCESSORIES
    'Accessories_Default': [
      'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&auto=format&fit=crop&q=80'
    ]
  };

  const cat = article.category || 'Tops';
  const rawColor = (article.color || article.perceived_color || '').toLowerCase();
  
  let colorKey = 'Default';
  if (rawColor.includes('black') || rawColor.includes('dark')) colorKey = 'Black';
  else if (rawColor.includes('white') || rawColor.includes('light') || rawColor.includes('off')) colorKey = 'White';
  else if (rawColor.includes('red') || rawColor.includes('pink') || rawColor.includes('burgundy')) colorKey = 'Red';
  else if (rawColor.includes('blue') || rawColor.includes('denim') || rawColor.includes('navy')) colorKey = 'Blue';

  const lookupKey = `${cat}_${colorKey}`;
  const defaultKey = `${cat}_Default`;
  
  const list = categoryColorImages[lookupKey] || categoryColorImages[defaultKey] || categoryColorImages['Tops_Default'];
  const hash = (article.article_id || '0').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return list[hash % list.length];
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
