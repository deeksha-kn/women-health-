'use client';

import { useState } from 'react';
import { useHealthStore, HealthData } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { DiseaseInfoModal } from '@/components/health/disease-info-modal';

interface HealthFormRedesignedProps {
  onSubmit: (data: HealthData) => void;
}

const CONDITIONS = ['PCOS', 'PCOD', 'Thyroid', 'Diabetes', 'Hypertension'];

const SYMPTOMS = [
  'Acne / breakouts',
  'Excess facial / body hair',
  'Hair thinning or loss',
  'Weight gain',
  'Weight loss',
  'Pelvic pain',
  'Bloating',
  'Dry skin',
  'Anxiety',
  'Mood swings',
  'Constipation',
  'High heart beat',
  'Low heart beat',
  'Muscle weakness',
  'Difficulty getting pregnant',
];

export function HealthFormRedesigned({ onSubmit }: HealthFormRedesignedProps) {
  const [step, setStep] = useState(1);
  const [showDiseaseInfo, setShowDiseaseInfo] = useState(false);
  const [formData, setFormData] = useState<Partial<HealthData>>({
    age: 30,
    weight: 65,
    height: 165,
    menstrualCycle: 'regular',
    existingDiagnoses: [],
    symptoms: [],
    sleepHours: 7,
    stressLevel: 5,
    exerciseDaysPerWeek: 3,
    notes: '',
  });

  const handleSymptomToggle = (symptom: string) => {
    setFormData((prev) => ({
      ...prev,
      symptoms: prev.symptoms?.includes(symptom)
        ? prev.symptoms.filter((s) => s !== symptom)
        : [...(prev.symptoms || []), symptom],
    }));
  };

  const handleConditionToggle = (condition: string) => {
    setFormData((prev) => ({
      ...prev,
      existingDiagnoses: prev.existingDiagnoses?.includes(condition)
        ? prev.existingDiagnoses.filter((d) => d !== condition)
        : [...(prev.existingDiagnoses || []), condition],
    }));
  };

  const handleSubmit = () => {
    const completeData: HealthData = {
      age: formData.age || 30,
      weight: formData.weight || 65,
      height: formData.height || 165,
      menstrualCycle: formData.menstrualCycle || 'regular',
      existingDiagnoses: formData.existingDiagnoses || [],
      symptoms: formData.symptoms || [],
      sleepHours: formData.sleepHours || 7,
      stressLevel: formData.stressLevel || 5,
      exerciseDaysPerWeek: formData.exerciseDaysPerWeek || 3,
      notes: formData.notes || '',
      faceImageUrl: undefined,
    };

    useHealthStore.setState({ currentHealthData: completeData });
    onSubmit(completeData);
  };

  return (
    <>
      <DiseaseInfoModal
        isOpen={showDiseaseInfo}
        onClose={() => setShowDiseaseInfo(false)}
      />
      <div className="space-y-8">
      {/* Step Indicator */}
      <div className="text-center mb-8">
        <p className="text-primary font-semibold text-sm uppercase tracking-wide mb-4">
          STEP {step} of 2
        </p>
        <h2 className="text-3xl font-bold text-foreground mb-2">
          {step === 1 && 'Your story so far'}
          {step === 2 && 'What are you feeling right now?'}
        </h2>
        <p className="text-gray-600">
          {step === 1 && 'The more context you share, the sharper the screening.'}
          {step === 2 && 'Select all symptoms you&apos;re currently experiencing.'}
        </p>
      </div>

      {/* Step 1: About You & Lifestyle */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* About You Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-foreground">About you</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Weight (kg)</label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Height (cm)</label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Menstrual cycle</label>
              <select
                value={formData.menstrualCycle}
                onChange={(e) => setFormData({ ...formData, menstrualCycle: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="not-sure">Not sure</option>
                <option value="regular">Regular</option>
                <option value="irregular">Irregular</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-3">Existing diagnoses</label>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map((condition) => (
                  <button
                    key={condition}
                    onClick={() => handleConditionToggle(condition)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      formData.existingDiagnoses?.includes(condition)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-foreground hover:bg-gray-200'
                    }`}
                  >
                    {condition}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lifestyle Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-foreground">Lifestyle</h3>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-foreground">Sleep per night</label>
                <span className="text-sm font-semibold text-primary">{formData.sleepHours} hrs</span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={formData.sleepHours}
                onChange={(e) => setFormData({ ...formData, sleepHours: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-foreground">Stress level</label>
                <span className="text-sm font-semibold text-primary">{formData.stressLevel}/10</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={formData.stressLevel}
                onChange={(e) => setFormData({ ...formData, stressLevel: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-foreground">Exercise days / week</label>
                <span className="text-sm font-semibold text-primary">{formData.exerciseDaysPerWeek}</span>
              </div>
              <input
                type="range"
                min="0"
                max="7"
                step="1"
                value={formData.exerciseDaysPerWeek}
                onChange={(e) => setFormData({ ...formData, exerciseDaysPerWeek: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Learn More Button */}
      <div className="flex justify-center">
        <Button
          onClick={() => setShowDiseaseInfo(true)}
          className="bg-accent hover:bg-accent/90 text-white px-8 py-2 rounded-lg font-semibold"
        >
          📚 Learn About These Conditions
        </Button>
      </div>

      {/* Step 2: Symptoms */}
      {step === 2 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 space-y-6">
          <h3 className="text-xl font-bold text-foreground">What are you feeling right now?</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SYMPTOMS.map((symptom) => (
              <button
                key={symptom}
                onClick={() => handleSymptomToggle(symptom)}
                className={`p-4 rounded-xl border-2 transition-all text-left font-medium ${
                  formData.symptoms?.includes(symptom)
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 text-foreground hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      formData.symptoms?.includes(symptom)
                        ? 'border-primary bg-primary'
                        : 'border-gray-300'
                    }`}
                  >
                    {formData.symptoms?.includes(symptom) && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span>{symptom}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}



      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4 pt-8">
        <Button
          onClick={() => setStep(Math.max(1, step - 1))}
          variant="outline"
          disabled={step === 1}
          className="w-full sm:w-auto"
        >
          Previous
        </Button>

        {step < 2 ? (
          <Button
            onClick={() => setStep(step + 1)}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            Next: Face Upload
          </Button>
        )}
      </div>
    </div>
    </>
  );
}
