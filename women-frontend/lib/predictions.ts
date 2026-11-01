import { HealthData, PredictionResult } from './store';

export interface DiseaseRisk {
  disease: string;
  riskScore: number;
  severity: 'low' | 'moderate' | 'high';
  factors: string[];
  recommendations: string[];
}

export function predictDiseases(healthData: HealthData): DiseaseRisk[] {
  const results: DiseaseRisk[] = [];

  // PCOS/PCOD Risk Assessment
  const pcosRisk = assessPCOS(healthData);
  results.push(pcosRisk);

  // Thyroid Risk Assessment
  const thyroidRisk = assessThyroid(healthData);
  results.push(thyroidRisk);

  // Stress-related Risk Assessment
  const stressRisk = assessStress(healthData);
  results.push(stressRisk);

  // Lifestyle-related Risk Assessment
  const lifestyleRisk = assessLifestyle(healthData);
  results.push(lifestyleRisk);

  // Hormonal Imbalance Risk Assessment
  const hormoneRisk = assessHormonalImbalance(healthData);
  results.push(hormoneRisk);

  return results.sort((a, b) => b.riskScore - a.riskScore);
}

function assessPCOS(data: HealthData): DiseaseRisk {
  let score = 0;
  const factors: string[] = [];

  // Age factor
  if (data.age && data.age >= 20 && data.age <= 40) score += 15;

  // Symptom-based scoring
  const pcosSymptoms = ['irregular periods', 'weight gain', 'facial hair', 'acne', 'hair loss', 'hirsutism'];
  const symptoms = data.symptoms || [];
  const matchedSymptoms = symptoms.filter(s => 
    pcosSymptoms.some(ps => s.toLowerCase().includes(ps.toLowerCase()))
  );
  score += matchedSymptoms.length * 12;
  if (matchedSymptoms.length > 0) factors.push(`Symptoms detected: ${matchedSymptoms.join(', ')}`);

  // Lifestyle factors
  if (data.stressLevel && data.stressLevel >= 7) {
    score += 10;
    factors.push('High stress levels');
  }
  if (data.exerciseDaysPerWeek && data.exerciseDaysPerWeek <= 1) {
    score += 8;
    factors.push('Low physical activity');
  }

  // Medical history
  const diagnoses = data.existingDiagnoses || [];
  if (diagnoses.some(h => h.toLowerCase().includes('diabetes'))) {
    score += 15;
    factors.push('Family history or diabetes');
  }

  // Normalize score to 0-100
  score = Math.min(score, 100);

  const severity = score < 30 ? 'low' : score < 60 ? 'moderate' : 'high';

  return {
    disease: 'PCOS/PCOD',
    riskScore: score,
    severity,
    factors,
    recommendations: generatePCOSRecommendations(score),
  };
}

function assessThyroid(data: HealthData): DiseaseRisk {
  let score = 0;
  const factors: string[] = [];

  // Age factor - thyroid issues common in women
  if (data.age && data.age >= 30) score += 10;

  // Symptom-based scoring
  const thyroidSymptoms = ['fatigue', 'weight gain', 'cold sensitivity', 'dry skin', 'hair loss', 'depression', 'anxiety'];
  const symptoms = data.symptoms || [];
  const matchedSymptoms = symptoms.filter(s =>
    thyroidSymptoms.some(ts => s.toLowerCase().includes(ts.toLowerCase()))
  );
  score += matchedSymptoms.length * 11;
  if (matchedSymptoms.length > 0) factors.push(`Thyroid-related symptoms: ${matchedSymptoms.join(', ')}`);

  // Sleep and lifestyle
  if (data.sleepHours && data.sleepHours < 6) {
    score += 8;
    factors.push('Inadequate sleep');
  }
  if (data.stressLevel && data.stressLevel >= 7) {
    score += 10;
    factors.push('High stress levels');
  }

  // Medical history
  const diagnoses = data.existingDiagnoses || [];
  if (diagnoses.some(h => h.toLowerCase().includes('thyroid'))) {
    score += 20;
    factors.push('Personal or family thyroid history');
  }
  if (diagnoses.some(h => h.toLowerCase().includes('autoimmune'))) {
    score += 12;
    factors.push('Autoimmune condition');
  }

  score = Math.min(score, 100);
  const severity = score < 30 ? 'low' : score < 60 ? 'moderate' : 'high';

  return {
    disease: 'Thyroid Disorder',
    riskScore: score,
    severity,
    factors,
    recommendations: generateThyroidRecommendations(score),
  };
}

function assessStress(data: HealthData): DiseaseRisk {
  let score = 0;
  const factors: string[] = [];

  // Direct stress assessment
  if (data.stressLevel && data.stressLevel >= 8) score += 35;
  else if (data.stressLevel && data.stressLevel >= 5) score += 15;

  // Sleep correlation
  if (data.sleepHours && data.sleepHours < 7) {
    score += 15;
    factors.push('Insufficient sleep (< 7 hours)');
  }

  // Stress-related symptoms
  const stressSymptoms = ['anxiety', 'depression', 'headache', 'insomnia', 'muscle tension', 'fatigue'];
  const symptoms = data.symptoms || [];
  const matchedSymptoms = symptoms.filter(s =>
    stressSymptoms.some(st => s.toLowerCase().includes(st.toLowerCase()))
  );
  score += matchedSymptoms.length * 8;
  if (matchedSymptoms.length > 0) factors.push(`Stress indicators: ${matchedSymptoms.join(', ')}`);

  // Exercise helps reduce stress
  if (data.exerciseDaysPerWeek && data.exerciseDaysPerWeek >= 5) {
    score = Math.max(0, score - 20);
    factors.push('Regular exercise helps manage stress');
  } else if (data.exerciseDaysPerWeek && data.exerciseDaysPerWeek <= 1) {
    score += 10;
    factors.push('Lack of physical activity');
  }

  score = Math.min(score, 100);
  const severity = score < 30 ? 'low' : score < 60 ? 'moderate' : 'high';

  return {
    disease: 'High Stress & Anxiety',
    riskScore: score,
    severity,
    factors,
    recommendations: generateStressRecommendations(score),
  };
}

function assessLifestyle(data: HealthData): DiseaseRisk {
  let score = 0;
  const factors: string[] = [];

  // Exercise frequency
  if (data.exerciseDaysPerWeek && data.exerciseDaysPerWeek <= 1) {
    score += 25;
    factors.push('Sedentary lifestyle');
  } else if (data.exerciseDaysPerWeek && data.exerciseDaysPerWeek <= 3) {
    score += 10;
  } else if (data.exerciseDaysPerWeek && data.exerciseDaysPerWeek >= 5) {
    score = Math.max(0, score - 15);
  }

  // Sleep quality
  if (data.sleepHours && data.sleepHours < 6) {
    score += 20;
    factors.push('Poor sleep (< 6 hours)');
  } else if (data.sleepHours && data.sleepHours > 9) {
    score += 10;
    factors.push('Excessive sleep (> 9 hours)');
  }

  score = Math.min(score, 100);
  const severity = score < 30 ? 'low' : score < 60 ? 'moderate' : 'high';

  return {
    disease: 'Lifestyle-Related Conditions',
    riskScore: score,
    severity,
    factors,
    recommendations: generateLifestyleRecommendations(score),
  };
}

function assessHormonalImbalance(data: HealthData): DiseaseRisk {
  let score = 0;
  const factors: string[] = [];

  // Age-related hormonal changes
  if (data.age && (data.age < 18 || (data.age >= 40 && data.age <= 55))) {
    score += 12;
    if (data.age < 18) factors.push('Adolescent hormonal development');
    else factors.push('Perimenopausal age range');
  }

  // Hormone-related symptoms
  const hormoneSymptoms = ['mood swings', 'irregular periods', 'hot flashes', 'night sweats', 'hormonal acne', 'breast tenderness'];
  const symptoms = data.symptoms || [];
  const matchedSymptoms = symptoms.filter(s =>
    hormoneSymptoms.some(hs => s.toLowerCase().includes(hs.toLowerCase()))
  );
  score += matchedSymptoms.length * 13;
  if (matchedSymptoms.length > 0) factors.push(`Hormonal symptoms: ${matchedSymptoms.join(', ')}`);

  // Stress impacts hormones
  if (data.stressLevel && data.stressLevel >= 7) {
    score += 12;
    factors.push('Stress-induced hormone disruption');
  }

  // Medical history
  const diagnoses = data.existingDiagnoses || [];
  if (diagnoses.some(h => 
    h.toLowerCase().includes('endometriosis') || 
    h.toLowerCase().includes('fibroid') || 
    h.toLowerCase().includes('cyst')
  )) {
    score += 18;
    factors.push('Existing reproductive health conditions');
  }

  score = Math.min(score, 100);
  const severity = score < 30 ? 'low' : score < 60 ? 'moderate' : 'high';

  return {
    disease: 'Hormonal Imbalance',
    riskScore: score,
    severity,
    factors,
    recommendations: generateHormoneRecommendations(score),
  };
}

function generatePCOSRecommendations(score: number): string[] {
  const recommendations = [
    'Maintain a low glycemic index diet',
    'Regular physical activity (150 minutes/week)',
    'Weight management if overweight',
    'Reduce refined carbohydrates and sugar',
  ];

  if (score > 60) {
    recommendations.push('Consult with endocrinologist');
    recommendations.push('Request hormonal panel testing');
    recommendations.push('Consider medication consultation');
  }

  return recommendations;
}

function generateThyroidRecommendations(score: number): string[] {
  const recommendations = [
    'Get TSH and thyroid hormone levels tested',
    'Ensure adequate iodine intake',
    'Manage stress levels',
    'Regular sleep schedule',
  ];

  if (score > 60) {
    recommendations.push('Consult thyroid specialist');
    recommendations.push('May require thyroid medication');
    recommendations.push('Regular monitoring recommended');
  }

  return recommendations;
}

function generateStressRecommendations(score: number): string[] {
  const recommendations = [
    'Practice meditation and mindfulness',
    'Regular exercise',
    'Adequate sleep (7-9 hours)',
    'Social support and counseling',
    'Yoga or relaxation techniques',
  ];

  if (score > 60) {
    recommendations.push('Consider therapy or counseling');
    recommendations.push('Consult healthcare provider');
    recommendations.push('Stress management programs recommended');
  }

  return recommendations;
}

function generateLifestyleRecommendations(score: number): string[] {
  const recommendations = [
    'Increase daily physical activity',
    'Eat balanced, nutritious meals',
    'Get 7-8 hours of quality sleep',
    'Limit processed foods',
    'Stay hydrated',
  ];

  if (score > 60) {
    recommendations.push('Consult nutritionist');
    recommendations.push('Consider lifestyle intervention program');
  }

  return recommendations;
}

function generateHormoneRecommendations(score: number): string[] {
  const recommendations = [
    'Track menstrual cycle',
    'Monitor physical and emotional symptoms',
    'Manage stress effectively',
    'Eat hormone-supporting foods',
  ];

  if (score > 60) {
    recommendations.push('Get comprehensive hormone testing');
    recommendations.push('Consult gynecologist or endocrinologist');
    recommendations.push('Consider hormone optimization');
  }

  return recommendations;
}
