'use client';

import { useState, useRef } from 'react';

interface HeroSectionProps {
  onStartClick: () => void;
}

export function HeroSection({ onStartClick }: HeroSectionProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-pink-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-6">
            <p className="text-primary font-semibold text-sm uppercase tracking-wide">
              For women, by science
            </p>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Listen to what your{' '}
                <span className="text-primary italic">hormones</span>
                {' '}are trying to say.
              </h1>

              <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
                Upload your photo and health data. HealthHub reads subtle facial signals and your symptom history to estimate your risk for PCOS, PCOD, thyroid imbalance, chronic stress and lifestyle conditions — in under a minute.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={onStartClick}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <span>🚀</span>
                Start screening
              </button>
            </div>

            <p className="text-sm text-gray-500 flex items-center gap-2 pt-2">
              <span>🔒</span>
              Private, on-device preview. Not a medical diagnosis.
            </p>
          </div>

          {/* Right Column - Photo Upload */}
          <div className="relative h-80 md:h-96 lg:h-full">
            {!preview ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-gradient-to-br from-pink-100 to-pink-50 rounded-3xl border-2 border-dashed border-pink-300 flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-primary hover:from-pink-50 hover:to-white transition-all"
              >
                <div className="text-center space-y-4">
                  <p className="text-5xl">📸</p>
                  <div>
                    <p className="text-lg font-bold text-foreground">Upload Your Photo</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Drag and drop your image here or click to browse
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="absolute inset-0 rounded-3xl overflow-hidden border-2 border-pink-300">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center gap-3">
                  <p className="text-white font-semibold text-center">Photo ready for analysis</p>
                  <button
                    onClick={() => setPreview(null)}
                    className="bg-white text-primary px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Change Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
