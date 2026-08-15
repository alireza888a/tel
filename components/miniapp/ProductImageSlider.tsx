import React, { useState } from 'react';
import { ShoppingBag, Image as ImageIcon, X, Maximize2 } from 'lucide-react';
import { Product } from '../../types';
import { getDisplayableImageUrl } from '../../utils/image';

export const ProductImageSlider: React.FC<{ product: Product; outOfStock?: boolean }> = ({ product, outOfStock }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  // NEW — tap-to-zoom. Self-contained here (not lifted up to ShopTab)
  // since nothing outside this component needs to know a lightbox is
  // open — same fullscreen-viewer pattern GalleryTab already uses for its
  // own images.
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const images = product.imageUrls && product.imageUrls.length > 0
    ? product.imageUrls.filter(u => u && u.trim() !== '')
    : (product.imageUrl && product.imageUrl.trim() !== '' ? [product.imageUrl] : []);

  if (images.length === 0) {
    return (
      <div className="w-full aspect-[4/3] rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex flex-col items-center justify-center text-slate-400 gap-1.5 relative mb-2">
        <ShoppingBag size={26} className="text-blue-400/70" />
        <span className="text-[10px] text-slate-400">بدون تصویر</span>
        {product.category && (
          <span className="absolute top-2 right-2 bg-black/60 border border-white/10 px-2 py-0.5 rounded-md text-[10px] text-slate-300 backdrop-blur-md">
            {product.category}
          </span>
        )}
        {outOfStock && (
          <span className="absolute top-2 left-2 bg-red-600/90 px-2 py-0.5 rounded-md text-[10px] font-bold text-white backdrop-blur-md z-10">
            ناموجود
          </span>
        )}
      </div>
    );
  }

  const currentImg = images[activeIdx] || images[0];
  const displayUrl = getDisplayableImageUrl(currentImg);

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev + 1) % images.length);
  };

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const openLightbox = () => {
    if (displayUrl) setLightboxOpen(true);
  };

  if (images.length === 1) {
    return (
      <>
        <div className="w-full aspect-[4/3] rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center relative mb-2 group">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={product.name}
              onClick={openLightbox}
              className={`w-full h-full object-cover cursor-zoom-in ${outOfStock ? 'grayscale opacity-50' : ''}`}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-2 text-center text-blue-400 gap-1">
              <ImageIcon size={22} />
              <span className="text-[9px] line-clamp-1">{currentImg}</span>
            </div>
          )}
          {displayUrl && (
            <div className="absolute bottom-2 left-2 p-1 bg-black/50 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Maximize2 size={11} />
            </div>
          )}
          {product.category && (
            <span className="absolute top-2 right-2 bg-black/60 border border-white/10 px-2 py-0.5 rounded-md text-[10px] text-slate-300 backdrop-blur-md">
              {product.category}
            </span>
          )}
          {outOfStock && (
            <span className="absolute top-2 left-2 bg-red-600/90 px-2 py-0.5 rounded-md text-[10px] font-bold text-white backdrop-blur-md z-10">
              ناموجود
            </span>
          )}
        </div>
        {lightboxOpen && <Lightbox url={displayUrl!} alt={product.name} onClose={() => setLightboxOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <div className="w-full aspect-[4/3] rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative mb-2 group">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={`${product.name} - ${activeIdx + 1}`}
            onClick={openLightbox}
            className={`w-full h-full object-cover cursor-zoom-in transition-all duration-300 ${outOfStock ? 'grayscale opacity-50' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-blue-400 gap-1">
            <ImageIcon size={22} />
            <span className="text-[9px] line-clamp-1">{currentImg}</span>
          </div>
        )}
        {displayUrl && (
          <div className="absolute bottom-2 left-2 p-1 bg-black/50 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <Maximize2 size={11} />
          </div>
        )}

        {product.category && (
          <span className="absolute top-2 right-2 bg-black/60 border border-white/10 px-2 py-0.5 rounded-md text-[10px] text-slate-300 backdrop-blur-md z-10">
            {product.category}
          </span>
        )}
        {outOfStock && (
          <span className="absolute top-2 left-2 bg-red-600/90 px-2 py-0.5 rounded-md text-[10px] font-bold text-white backdrop-blur-md z-10">
            ناموجود
          </span>
        )}

        <button
          type="button"
          onClick={prevSlide}
          className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-80 hover:opacity-100 transition-all z-10"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={nextSlide}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-80 hover:opacity-100 transition-all z-10"
        >
          ›
        </button>

        <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1 z-10 pointer-events-none">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIdx(idx);
              }}
              className={`h-1.5 rounded-full transition-all pointer-events-auto ${
                idx === activeIdx ? 'bg-blue-400 w-3.5' : 'bg-white/40 w-1.5'
              }`}
            />
          ))}
        </div>
      </div>
      {lightboxOpen && displayUrl && (
        <Lightbox
          url={displayUrl}
          alt={`${product.name} - ${activeIdx + 1}`}
          onClose={() => setLightboxOpen(false)}
          onPrev={images.length > 1 ? (e) => prevSlide(e) : undefined}
          onNext={images.length > 1 ? (e) => nextSlide(e) : undefined}
        />
      )}
    </>
  );
};

// Fullscreen tap-to-zoom viewer, shared by the single- and multi-image
// cases above. Same visual language as GalleryTab's own lightbox (dark
// overlay, close button top corner) so a buyer sees one consistent
// "tap an image to see it full-size" behavior across the whole Mini App.
const Lightbox: React.FC<{
  url: string;
  alt: string;
  onClose: () => void;
  onPrev?: (e: React.MouseEvent) => void;
  onNext?: (e: React.MouseEvent) => void;
}> = ({ url, alt, onClose, onPrev, onNext }) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 left-4 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10"
      >
        <X size={20} />
      </button>

      {onPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(e); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors z-10"
        >
          ‹
        </button>
      )}
      {onNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(e); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors z-10"
        >
          ›
        </button>
      )}

      <img
        src={url}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
      />
    </div>
  );
};
