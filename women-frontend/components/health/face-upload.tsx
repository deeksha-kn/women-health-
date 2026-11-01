'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

interface FaceUploadProps {
  onImageUpload: (imageUrl: string, imageFile?: File) => void;
  onSkip: () => void;
}

export function FaceUpload({ onImageUpload, onSkip }: FaceUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size should be less than 10MB');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
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
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleConfirm = () => {
    if (preview && selectedFile) {
      onImageUpload(preview, selectedFile);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-primary font-semibold text-sm uppercase tracking-wide mb-4">
          STEP 3 OF 3
        </p>
        <h2 className="text-3xl font-bold text-foreground mb-2">Face Analysis</h2>
        <p className="text-gray-600">
          Upload a clear photo for AI-powered facial analysis (optional)
        </p>
      </div>

      {!preview ? (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-pink-300 bg-pink-50/50 rounded-2xl p-12 text-center cursor-pointer hover:border-primary hover:bg-pink-50 transition-all"
        >
          <div className="text-6xl mb-4">📸</div>
          <h3 className="text-xl font-semibold text-foreground mb-3">Upload Your Photo</h3>
          <p className="text-gray-600 mb-2">
            Drag and drop your image here or click to browse
          </p>
          <p className="text-sm text-gray-500">
            JPG, PNG or GIF (max. 10MB)
          </p>
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
        <div className="space-y-6">
          <div className="relative w-full h-80 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover"
            />
          </div>
          <p className="text-sm text-center text-gray-600">
            Image selected. This will be analyzed for subtle facial signals related to hormonal health.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Our AI analyzes facial features like skin texture, 
              complexion, and other indicators that may correlate with hormonal conditions. 
              This is supplementary to your health data.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={() => setPreview(null)}
              variant="outline"
              className="flex-1"
            >
              Change Photo
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="flex-1 bg-primary hover:bg-primary/90 text-white"
            >
              Use This Photo
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          onClick={onSkip}
          variant="outline"
          className="flex-1"
        >
          Skip Face Analysis
        </Button>
      </div>
    </div>
  );
}
