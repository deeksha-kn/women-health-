'use client';

import { useState } from 'react';
import { useHealthStore, HealthData } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { HealthFormRedesigned } from '@/components/health/health-form-redesigned';
import { FaceUpload } from '@/components/health/face-upload';
import { PredictionResults } from '@/components/health/prediction-results';
import { AuthModal } from '@/components/auth/auth-modal';
import { predictApi, type TextPredictionResponse, type ImagePredictionResponse } from '@/lib/api';
import { buildModelInputs } from '@/lib/model-mapper';

export interface CombinedResult {
  textResults: TextPredictionResponse[];
  imageResult: ImagePredictionResponse | null;
}

type AppState = 'landing' | 'health-form' | 'face-upload' | 'results';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [appState, setAppState] = useState<AppState>('landing');
  const [combinedResult, setCombinedResult] = useState<CombinedResult>({ textResults: [], imageResult: null });
  const [predictError, setPredictError] = useState('');
  const [isPredicting, setIsPredicting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleStartAnalysis = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setCombinedResult({ textResults: [], imageResult: null });
    setPredictError('');
    setAppState('health-form');
  };

  const handleHealthFormSubmit = (healthData: HealthData) => {
    useHealthStore.setState({ currentHealthData: healthData });
    setAppState('face-upload');
  };

  const runTextPredictions = async (healthData: HealthData): Promise<TextPredictionResponse[]> => {
    const inputs = buildModelInputs(healthData);
    const results: TextPredictionResponse[] = [];

    const variants: Array<{ condition: string; variantId: string; data: Record<string, unknown> }> = [
      { condition: 'pcos', variantId: 'pcos_dataset', data: inputs.pcos },
      { condition: 'pcod', variantId: 'pcod_v1', data: inputs.pcod },
      { condition: 'thyroid', variantId: 'thyroid_v2', data: inputs.thyroid_v2 },
    ];

    for (const v of variants) {
      try {
        const result = await predictApi.text(v.condition, v.data, v.variantId);
        results.push(result);
      } catch (err) {
        console.warn(`${v.condition} prediction failed:`, err);
      }
    }
    return results;
  };

  const handleImageUpload = async (imageUrl: string, imageFile?: File) => {
    const data = useHealthStore.getState().currentHealthData;
    if (!data) return;

    const updatedData = { ...data, faceImageUrl: imageUrl };
    useHealthStore.setState({ currentHealthData: updatedData });
    setIsPredicting(true);
    setPredictError('');

    try {
      const [textResults, imageResult] = await Promise.all([
        runTextPredictions(updatedData),
        imageFile ? predictApi.image(imageFile).catch((err) => {
          console.warn('Image prediction failed:', err);
          return null;
        }) : Promise.resolve(null),
      ]);
      setCombinedResult({ textResults, imageResult });
      setAppState('results');
    } catch (err) {
      setPredictError('Prediction failed. Please check your connection and try again.');
      console.error(err);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleSkipFaceUpload = async () => {
    const data = useHealthStore.getState().currentHealthData;
    if (!data) return;

    setIsPredicting(true);
    setPredictError('');
    try {
      const textResults = await runTextPredictions(data);
      setCombinedResult({ textResults, imageResult: null });
      setAppState('results');
    } catch (err) {
      setPredictError('Prediction failed. Please check your connection and try again.');
      console.error(err);
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-foreground">
      <Navbar />

      {appState === 'landing' && (
        <HeroSection onStartClick={handleStartAnalysis} />
      )}

      {appState !== 'landing' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <button
            onClick={() => setAppState('landing')}
            className="text-primary hover:text-primary/80 font-medium transition-colors mb-8"
          >
            ← Back to Home
          </button>

          {predictError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {predictError}
            </div>
          )}

          {isPredicting && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Analysing your health data…</p>
            </div>
          )}

          {!isPredicting && appState === 'health-form' && (
            <HealthFormRedesigned onSubmit={handleHealthFormSubmit} />
          )}

          {!isPredicting && appState === 'face-upload' && (
            <FaceUpload
              onImageUpload={handleImageUpload}
              onSkip={handleSkipFaceUpload}
            />
          )}

          {!isPredicting && appState === 'results' && (
            <PredictionResults
              combinedResult={combinedResult}
              onSaveResults={() => setAppState('landing')}
              onNewAnalysis={handleStartAnalysis}
            />
          )}
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab="register"
      />
    </main>
  );
}
