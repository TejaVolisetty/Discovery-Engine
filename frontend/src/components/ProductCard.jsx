import React, { useState, useRef } from 'react';

// Extensive luxury product photography library
const categoryPhotos = {
  Shoes: [
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80'
  ],
  Jackets: [
    'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&auto=format&fit=crop&q=80'
  ],
  Dresses: [
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&auto=format&fit=crop&q=80'
  ],
  Tops: [
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&auto=format&fit=crop&q=80'
  ],
  Trousers: [
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80'
  ],
  Accessories: [
    'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80'
  ]
};

export function getProductImage(article) {
  if (article.image_url && article.image_url.startsWith('http')) {
    return article.image_url;
  }

  const cat = article.category || 'Tops';
  const photos = categoryPhotos[cat] || categoryPhotos['Tops'];
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
    if (onClick) onClick(article);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (onAddToCart) onAddToCart(article);
  };

  const handleMouseEnter = () => {
    hoverTimerRef.current = setTimeout(() => {
      if (onHoverLong) onHoverLong(article);
    }, 800);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const displayImage = getProductImage(article);
  const priceFormatted = article.price ? `$${(article.price * 100).toFixed(0)}` : '$299';

  return (
    <div className="perspective-1000 animate-reveal-3d">
      <div
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`group relative bg-white rounded-[24px] p-4 border border-[#ECE8E2] luxury-glass-3d card-3d-hover cursor-pointer flex flex-col justify-between preserve-3d ${
          isClicked ? 'scale-[0.97]' : ''
        }`}
      >
        {/* Product Image Area */}
        <div className="relative aspect-square w-full rounded-[20px] bg-[#F3EFE8]/70 overflow-hidden flex items-center justify-center p-3 preserve-3d">
          
          {/* Badge: Bestseller or Match Score */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 transform translate-z-10">
            {article.score ? (
              <span className="px-2.5 py-1 text-[10px] font-bold rounded-full luxury-glass-3d text-[#5E7656] border border-[#ECE8E2] shadow-md">
                {(article.score * 100).toFixed(0)}% Match
              </span>
            ) : (
              <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full luxury-glass-3d text-[#2B2B2B] border border-[#ECE8E2] shadow-md">
                Bestseller
              </span>
            )}
          </div>

          <img
            src={displayImage}
            alt={article.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center rounded-[16px] group-hover:scale-108 transition-transform duration-700 ease-out"
            loading="lazy"
          />

          {/* Explainability Reason Hover Overlay */}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-[#2B2B2B]/90 via-[#2B2B2B]/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-20 flex items-center gap-2">
            <span className="text-amber-300 text-xs">✨</span>
            <p className="text-[11px] text-white font-medium leading-tight line-clamp-2">
              {article.reason || 'Recommended based on your session style'}
            </p>
          </div>
        </div>

        {/* Product Title & Floating 3D Plus Add Button */}
        <div className="mt-4 flex items-end justify-between px-1 preserve-3d">
          <div>
            <h3 className="font-serif-luxury text-lg font-semibold text-[#2B2B2B] group-hover:text-[#5E7656] transition-colors leading-tight line-clamp-1">
              {article.title}
            </h3>
            <p className="text-sm font-semibold text-[#777777] mt-0.5">{priceFormatted}</p>
          </div>

          {/* Floating 3D Plus Add Button */}
          <button
            onClick={handleAddToCart}
            className="w-10 h-10 rounded-full bg-[#FAF8F4] border border-[#ECE8E2] hover:bg-[#5E7656] hover:text-white hover:border-[#5E7656] text-[#2B2B2B] flex items-center justify-center text-lg font-medium shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-90"
            title="Add to Cart"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
