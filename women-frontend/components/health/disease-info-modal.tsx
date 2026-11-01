'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DISEASE_DATABASE, DiseaseInfo } from '@/lib/disease-info';

interface DiseaseInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DiseaseInfoModal({ isOpen, onClose }: DiseaseInfoModalProps) {
  const [selectedDisease, setSelectedDisease] = useState<string | null>('pcos');

  if (!isOpen) return null;

  const diseases = Object.entries(DISEASE_DATABASE).map(([key, value]) => ({
    key,
    ...value,
  }));

  const current = diseases.find((d) => d.key === selectedDisease);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-foreground">Health Conditions Guide</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-light"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 border-b border-gray-200">
          {diseases.map((disease) => (
            <button
              key={disease.key}
              onClick={() => setSelectedDisease(disease.key)}
              className={`p-3 rounded-lg text-center font-semibold transition-all ${
                selectedDisease === disease.key
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-gray-100 text-foreground hover:bg-gray-200'
              }`}
            >
              {disease.name}
            </button>
          ))}
        </div>

        {/* Content */}
        {current && (
          <div className="p-8 space-y-8">
            {/* Title and Description */}
            <div>
              <h3 className="text-3xl font-bold text-primary mb-2">{current.fullName}</h3>
              <p className="text-lg text-gray-700">{current.shortDescription}</p>
            </div>

            {/* Importance Box */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
              <h4 className="font-bold text-yellow-900 mb-2">Why This Matters</h4>
              <p className="text-yellow-900">{current.importance}</p>
            </div>

            {/* What Causes It */}
            <div>
              <h4 className="text-2xl font-bold text-foreground mb-4">What Causes It?</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {current.causes.map((cause, i) => (
                  <div key={i} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-gray-800 text-sm">{cause}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Symptoms */}
            <div>
              <h4 className="text-2xl font-bold text-foreground mb-4">Common Symptoms</h4>
              <div className="grid md:grid-cols-2 gap-3">
                {current.symptoms.map((symptom, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-pink-50 rounded-lg border border-pink-200">
                    <span className="text-primary font-bold mt-0.5">•</span>
                    <span className="text-gray-800 text-sm">{symptom}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Factors */}
            <div>
              <h4 className="text-2xl font-bold text-foreground mb-4">Risk Factors</h4>
              <div className="grid md:grid-cols-2 gap-3">
                {current.riskFactors.map((factor, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-primary font-bold mt-0.5">⚠</span>
                    <span className="text-gray-800 text-sm">{factor}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What You Can Do */}
            <div>
              <h4 className="text-2xl font-bold text-foreground mb-4">What You Can Do</h4>
              <div className="space-y-3">
                {current.whatYouCanDo.map((action, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-primary font-bold text-lg flex-shrink-0">✓</span>
                    <span className="text-gray-800">{action}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-gray-50 border border-gray-300 p-6 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Disclaimer:</strong> This information is educational and not a substitute for professional medical advice. 
                If you suspect you have any of these conditions, please consult with a healthcare provider for proper diagnosis and treatment.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-2 rounded-lg"
          >
            Close & Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
