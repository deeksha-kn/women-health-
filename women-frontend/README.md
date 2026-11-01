# HealthHub - Women's Hormonal Health Prediction Platform

## Overview

HealthHub is an AI-powered web application designed to help women understand their hormonal health by analyzing symptoms, medical history, lifestyle factors, and optional facial features. The application provides risk assessments for common hormonal conditions affecting women.

## Features

### 1. User Authentication
- **Sign Up / Login**: Create a secure account to access personalized features
- **Session Persistence**: Your session is saved across browser restarts
- **User Dashboard**: Personalized welcome and quick access to analysis tools

### 2. Health Data Collection
- **Symptom Tracking**: Select from 19+ common hormonal symptoms
- **Medical History**: Record relevant health conditions and family history
- **Lifestyle Assessment**: Track sleep hours, exercise frequency, stress levels, and diet

### 3. Face Analysis Upload
- **Optional Photo Upload**: Upload a clear facial photo for AI analysis
- **Image Processing**: Safe and secure image handling
- **Supplementary Analysis**: Facial indicators provide additional health insights

### 4. AI-Powered Risk Assessment
The application analyzes data and predicts risk levels for:
- **PCOS/PCOD** (Polycystic Ovary Syndrome)
- **Thyroid Disorders**
- **High Stress & Anxiety**
- **Lifestyle-Related Conditions**
- **Hormonal Imbalance**

Each risk assessment includes:
- Risk score (0-100)
- Severity level (Low/Moderate/High)
- Contributing factors
- Personalized health recommendations

### 5. Results & Recommendations
- **Detailed Risk Reports**: Comprehensive breakdown of each assessed condition
- **Personalized Recommendations**: Evidence-based suggestions for each risk area
- **Action Plans**: Next steps for healthcare consultation and lifestyle improvements

## Technology Stack

### Frontend
- **Next.js 16** - React framework with server-side rendering
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS styling
- **shadcn/ui** - High-quality React components
- **Zustand** - Lightweight state management
- **React Hook Form** - Form handling and validation

### Styling
- **OKLCH Color Model** - Modern color space for accessible design
- **Healthcare-themed Palette**: 
  - Primary: Teal/Blue (trust and calm)
  - Accent: Gold/Yellow (energy and positivity)
  - Neutral: Soft grays (professional and clean)

## Getting Started

### Installation

1. **Clone the repository** (or download the project)
   ```bash
   cd my-project
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Run the development server**
   ```bash
   pnpm dev
   ```

4. **Open in browser**
   - Navigate to `http://localhost:3000`
   - Start by creating an account or logging in

### Demo Credentials

For testing, you can create any email/password combination. The app uses mock authentication for demonstration purposes.

## How to Use

### Step 1: Create Account
1. Click "Create one here" on the login page
2. Enter your name, email, and password
3. Click "Create Account"

### Step 2: Start Analysis
1. From the dashboard, click "New Analysis"
2. Enter your age
3. Select any symptoms you're experiencing
4. Select medical conditions (if applicable)

### Step 3: Lifestyle Information
1. Adjust your average sleep hours (4-12 hours)
2. Select your stress level (Low/Medium/High)
3. Choose your exercise frequency
4. Select your typical diet type

### Step 4: Face Analysis (Optional)
1. Drag and drop a clear facial photo, or click to browse
2. Review the preview image
3. Click "Use This Photo" or "Skip Face Analysis"

### Step 5: Review Results
1. Examine risk scores for each condition
2. Read contributing factors
3. Review personalized recommendations
4. Click "Save Results" to store in your account

## Disease Assessments

### PCOS/PCOD
- **Risk Factors**: Irregular periods, weight gain, facial hair, acne
- **Lifestyle Impact**: Diet, exercise, stress management
- **Recommendations**: Low glycemic diet, regular exercise, hormone testing

### Thyroid Disorder
- **Risk Factors**: Fatigue, weight changes, cold sensitivity
- **Sleep Impact**: Inadequate sleep increases risk
- **Recommendations**: TSH testing, iodine intake, stress management

### Stress & Anxiety
- **Symptoms**: Anxiety, depression, sleep issues, muscle tension
- **Lifestyle Connection**: Sleep quality, exercise frequency
- **Recommendations**: Meditation, exercise, professional counseling

### Lifestyle-Related Conditions
- **Factors**: Exercise frequency, diet quality, sleep patterns
- **Impact**: Sedentary lifestyle increases all health risks
- **Recommendations**: Regular movement, balanced nutrition, consistent sleep

### Hormonal Imbalance
- **Age-Related**: More common during puberty and perimenopause
- **Symptoms**: Mood swings, irregular periods, hot flashes
- **Recommendations**: Hormone testing, stress management, medical consultation

## Important Disclaimers

### Medical Disclaimer
HealthHub provides **AI-powered risk assessments for informational purposes only**. This application does **NOT provide medical diagnosis** and should **NOT replace professional medical advice**. Always consult qualified healthcare professionals for:
- Proper diagnosis of health conditions
- Treatment plans and medical interventions
- Management of identified health concerns
- Emergency medical situations

### Data Privacy
- Your health information is confidential
- Data is stored securely (in mock storage for this demo)
- No data is shared with third parties
- You can request data deletion at any time

### When to Seek Immediate Help
Contact a healthcare provider or emergency services if you experience:
- Severe symptoms requiring immediate attention
- Sudden significant changes in health
- Concerning physical symptoms
- Mental health crisis

## Project Structure

```
/app
  /page.tsx          # Main application page
  /layout.tsx        # Root layout and metadata
  /globals.css       # Global styles and theme variables

/components
  /auth              # Authentication components
    /login-form.tsx
    /signup-form.tsx
  /health            # Health analysis components
    /health-form.tsx
    /face-upload.tsx
    /prediction-results.tsx
  /dashboard         # User dashboard
    /user-dashboard.tsx
  /layout            # Layout components
    /header.tsx
    /info-section.tsx
  /ui                # shadcn/ui components

/lib
  /store.ts          # Zustand state management
  /predictions.ts    # Disease risk assessment logic
  /utils.ts          # Utility functions
```

## Key Files

### `/lib/predictions.ts`
Contains the core AI assessment logic:
- `predictDiseases()` - Main prediction function
- `assessPCOS()`, `assessThyroid()`, etc. - Individual disease assessments
- Risk scoring algorithm based on symptoms, lifestyle, and medical history

### `/lib/store.ts`
State management for:
- User authentication (login/signup)
- Health data storage
- Prediction results

### `/app/page.tsx`
Main application logic:
- State machine for different screens
- Flow management (login → health form → face upload → results)
- Component orchestration

## Future Enhancements

Planned features for next versions:
- Real backend database integration (Supabase/Neon)
- Actual machine learning models for facial analysis
- Medical report upload and storage
- Appointment scheduling with healthcare providers
- Symptom tracking over time
- Integration with health APIs (Apple Health, Google Fit)
- Community support features
- Multi-language support
- Mobile app version

## Contributing

This is a demonstration application. For production use:
1. Implement real authentication with proper password hashing
2. Set up secure database with encryption
3. Add HIPAA/GDPR compliance measures
4. Integrate with actual medical AI models
5. Add comprehensive testing
6. Implement audit logging

## License

This project is provided as-is for educational and demonstration purposes.

## Support

For issues or questions:
1. Review the embedded disclaimers in the application
2. Consult healthcare professionals for medical concerns
3. Refer to the "How It Works" section in the dashboard

---

**Created with v0** - AI-powered development assistant by Vercel

**Remember**: This tool is for health awareness and education. Always prioritize professional medical consultation for any health concerns.
