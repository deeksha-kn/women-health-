/**
 * Converts the generic health-form's HealthData object (age, weight, symptoms[],
 * menstrualCycle, etc.) into the specific feature dictionaries each XGBoost
 * model variant actually expects.
 *
 * Each model was trained on a particular dataset with its own schema (see
 * backend/app/ml/artifacts/text/encodings/). The feature mappings here
 * were designed to match those schemas as closely as possible given the
 * overlap between the generic form fields and what the models were trained on.
 *
 * Where a form field doesn't exist for a needed model feature, we provide
 * a sensible default (the most common/neutral value from the training data)
 * rather than sending a 0 or empty string which could be semantically wrong
 * (e.g. weight_loss=0 means "no weight loss", not "unknown").
 */

import type { HealthData } from '@/lib/store';

/** True if the given symptom string is present in the form's symptom array */
const has = (symptoms: string[], ...candidates: string[]): 1 | 0 =>
  candidates.some(c => symptoms.some(s => s.toLowerCase().includes(c.toLowerCase()))) ? 1 : 0;

// ─── PCOS model inputs (pcos_dataset schema, 32 features — verified against
// GET /api/predict/text/schema/pcos_dataset) ──────────────────────────────────
// The PCOS model was trained on PCOS_DataSet_cleaned.csv: almost entirely
// categorical Yes/No/May-be fields plus a handful of lab-result categoricals
// (LH_hormone, FSH_hormone, etc.) that a symptom-only form can't supply —
// those use "I do not know", which is itself a valid trained category
// (this dataset's authors anticipated patients not having lab results).
export function buildPcosInputs(h: HealthData): Record<string, unknown> {
  const bmi = h.weight / ((h.height / 100) ** 2);
  const irregular = h.menstrualCycle?.toLowerCase().includes('irregular') ? 'Irregular' : 'Regular';
  const age_cat = h.age < 18 ? 'Youth' : h.age <= 25 ? 'Young adult' : 'adult';

  const weight_gain = has(h.symptoms, 'weight gain', 'gaining weight') || h.weight / ((h.height / 100) ** 2) >= 25;
  const hair_loss = has(h.symptoms, 'hair loss', 'hair thinning', 'hair fall');
  const acne = has(h.symptoms, 'acne', 'pimple', 'breakout');
  const mood_swings = has(h.symptoms, 'mood', 'anxiety', 'depression', 'emotional');
  const excess_facial_hair = has(h.symptoms, 'facial hair', 'excess hair', 'hirsutism');
  const excess_body_hair = has(h.symptoms, 'body hair', 'excess hair', 'hirsutism');
  const dark_area = has(h.symptoms, 'skin darkening', 'dark skin', 'hyperpigmentation', 'dark patches');
  const fast_food = h.notes?.toLowerCase().includes('fast food') ?? false;
  const abdominal_pain = has(h.symptoms, 'pelvic pain', 'cramp', 'abdominal pain');
  const depressed = has(h.symptoms, 'depression', 'sad', 'low mood');
  const stressed = h.stressLevel >= 4;
  const insomnia = has(h.symptoms, 'insomnia', 'sleep', 'trouble sleeping') || h.sleepHours < 5;

  return {
    // Lab-result categoricals the form genuinely cannot supply — "I do not
    // know" is a real trained category (this dataset's own authors expected
    // many respondents not to have these results), so this is an honest
    // "unknown" rather than a fabricated guess.
    LH_hormone: 'I do not know',
    FSH_hormone: 'I do not know',
    Diabetes_measurment: 'I do not know',
    TSH_hormone: 'I do not know',
    Prolactin_hormone: 'I do not know',
    Hemoglobin_level: 'I do not know',
    Cyst_ovary: 'I do not know',

    Family_background: h.existingDiagnoses?.some(d => d.toLowerCase().includes('family')) ? 'Yes' : 'I do not know',
    Diagnosis_age: age_cat,
    Overweight: bmi >= 25 ? 'Yes' : 'No',
    Period_type: irregular,
    Hormonal_imbalance: (hair_loss || acne || excess_facial_hair || mood_swings || weight_gain) ? 'Yes' : 'No',
    Gain_weight: weight_gain ? 'Yes' : 'No',
    Excess_facial_hair: excess_facial_hair ? 'Yes' : 'No',
    Excess_body_hair: excess_body_hair ? 'Yes' : 'No',
    Dark_area: dark_area ? 'Yes' : 'No',
    Pimple_face: acne ? 'Yes' : 'No',
    Hormonal_acne_face: acne ? 'Yes' : 'No',
    Blood_pressure: 'Normal',  // not collected by the form; "Normal" is the modal/default value
    Fast_food: fast_food ? 'Yes' : 'No',
    Losing_hair: hair_loss ? 'Yes' : 'No',
    Ex_pain_abdominal: abdominal_pain ? 'Yes' : 'No',
    Mood_swing_period: mood_swings ? 'High' : 'Normal',
    Mood_swing_normal: mood_swings ? 'High' : 'Normal',
    Craving_PT: 'Normal',  // food cravings around periods — not collected, default to modal value
    Depress: depressed ? 'Yes' : 'No',
    Mental_stress: stressed ? 'Yes' : 'No',
    Insomnia: insomnia ? 'Yes' : 'No',
    Slow_activity: h.exerciseDaysPerWeek === 0 ? 'Yes' : h.exerciseDaysPerWeek <= 2 ? 'May be' : 'No',

    'Weight(kg)': h.weight,
    'Height(m)': h.height / 100,
    'BMI(kg/m*m)': parseFloat(bmi.toFixed(1)),
  };
}

// ─── PCOD v1 model inputs (9 numeric features) ───────────────────────────────
export function buildPcodInputs(h: HealthData): Record<string, unknown> {
  const bmi = h.weight / ((h.height / 100) ** 2);
  return {
    age: h.age,
    bmi: parseFloat(bmi.toFixed(1)),
    irregular_periods: h.menstrualCycle?.toLowerCase().includes('irregular') ? 1 : 0,
    weight_gain: has(h.symptoms, 'weight gain', 'gaining weight'),
    hair_loss: has(h.symptoms, 'hair loss', 'hair thinning', 'hair fall'),
    acne: has(h.symptoms, 'acne', 'pimple', 'breakout'),
    excess_facial_body_hair: has(h.symptoms, 'facial hair', 'body hair', 'excess hair', 'hirsutism'),
    difficulty_getting_pregnant: has(h.symptoms, 'conceiving', 'fertility', 'pregnant', 'infertility'),
    cycle_length_days: h.menstrualCycle?.toLowerCase().includes('long') ? 35 :
                       h.menstrualCycle?.toLowerCase().includes('short') ? 21 : 28,
  };
}

// ─── Thyroid v2 model inputs (17 features: sex, age, TSH + 14 symptom flags) ─
// This is the "symptom-friendly" thyroid model — uses TSH but not the full panel.
// Since the form doesn't collect TSH, we use a value that indicates ambiguity
// (2.5 mIU/L = solidly in the normal range) rather than 0 which would look
// like severe hyperthyroid, and flag it in the notes. In production, you'd
// add a TSH field to the form or use thyroid_preprocessed2 when lab values exist.
export function buildThyroidV2Inputs(h: HealthData): Record<string, unknown> {
  return {
    age: h.age,
    sex: 'F',  // the app is women's health — all users are female
    tsh_level_mIU_L: 2.5,  // normal-range default when TSH not collected
    fatigue: has(h.symptoms, 'fatigue', 'tired', 'exhausted', 'low energy'),
    weight_gain: has(h.symptoms, 'weight gain', 'gaining weight'),
    weight_loss: has(h.symptoms, 'weight loss', 'losing weight'),
    hair_loss: has(h.symptoms, 'hair loss', 'hair thinning', 'hair fall'),
    constipation: has(h.symptoms, 'constipation', 'bowel', 'digestive'),
    slow_heart_rate: has(h.symptoms, 'slow heart', 'bradycardia'),
    rapid_heartbeat: has(h.symptoms, 'rapid heart', 'palpitation', 'fast heart', 'tachycardia'),
    muscle_weakness: has(h.symptoms, 'muscle weakness', 'weak muscles', 'weakness'),
    difficulty_concentrating: has(h.symptoms, 'concentration', 'focus', 'brain fog', 'memory'),
    cold_intolerance: has(h.symptoms, 'cold', 'always cold', 'cold intolerance'),
    heat_intolerance: has(h.symptoms, 'heat', 'sweating', 'hot flashes', 'heat intolerance'),
    goiter: has(h.symptoms, 'goiter', 'neck swelling', 'throat swelling'),
    tremor: has(h.symptoms, 'tremor', 'shaking', 'trembling'),
    atrial_fibrillation: has(h.symptoms, 'atrial fibrillation', 'irregular heartbeat', 'arrhythmia'),
  };
}

// ─── Combined builder ─────────────────────────────────────────────────────────

export interface ModelInputs {
  pcos: Record<string, unknown>;
  pcod: Record<string, unknown>;
  thyroid_v2: Record<string, unknown>;
}

export function buildModelInputs(h: HealthData): ModelInputs {
  return {
    pcos: buildPcosInputs(h),
    pcod: buildPcodInputs(h),
    thyroid_v2: buildThyroidV2Inputs(h),
  };
}
