# HealthHub — Women's Health Prediction System

A multimodal health screening application combining XGBoost symptom-based classifiers and a MobileNetV2 acne image analysis model, with a Next.js frontend and a FastAPI backend.

---

## Project Structure

```
healthhub/
├── backend/                   FastAPI backend
│   ├── app/
│   │   ├── main.py            App entry point, CORS, route registration
│   │   ├── api/
│   │   │   ├── deps.py        JWT auth dependency
│   │   │   └── routes/
│   │   │       ├── auth.py        Register, login, refresh, forgot/reset password
│   │   │       ├── predictions.py Text and image prediction endpoints
│   │   │       ├── history.py     View, stats, delete prediction history
│   │   │       ├── reports.py     PDF report download
│   │   │       └── user.py        Profile view/edit
│   │   ├── core/
│   │   │   ├── config.py      Pydantic settings (reads from .env)
│   │   │   └── security.py    bcrypt password hashing, JWT creation/decode
│   │   ├── db/
│   │   │   └── session.py     SQLAlchemy engine, session, Base
│   │   ├── ml/
│   │   │   ├── registry.py    Model variant catalog (5 text models + image)
│   │   │   ├── feature_encoder.py  Exact LabelEncoder replication for each model
│   │   │   ├── text_predictor.py   XGBoost model loading and prediction
│   │   │   ├── image_predictor.py  MobileNetV2 loading, degraded-model detection
│   │   │   └── artifacts/
│   │   │       ├── text/      5 trained .json model files + encodings/
│   │   │       └── image/     mobilenetv2_skin_severity.keras
│   │   ├── models/            SQLAlchemy ORM models
│   │   ├── schemas/           Pydantic request/response schemas
│   │   └── services/          Business logic (auth, prediction, upload, report, email)
│   ├── alembic/               Database migrations
│   ├── storage/
│   │   ├── uploads/acne_images/
│   │   └── reports/
│   ├── .env.example           All env vars documented
│   ├── requirements.txt
│   └── README.md              (this file)
│
└── frontend/                  Next.js 16 frontend
    ├── app/
    │   ├── page.tsx           Main flow: landing → form → image → results
    │   ├── dashboard/page.tsx Prediction history, stats, PDF downloads
    │   ├── profile/page.tsx   View/edit profile
    │   ├── forgot-password/   Password reset request
    │   └── reset-password/    Password reset form (linked from email)
    ├── components/
    │   ├── auth/auth-modal.tsx  Login/register modal
    │   ├── layout/navbar.tsx    Auth-aware navbar with user menu
    │   └── health/              Existing prediction form, face upload, results
    └── lib/
        ├── api.ts              Centralized API client with auto token-refresh
        ├── auth-context.tsx    React auth context (login, register, logout)
        └── model-mapper.ts     Converts form fields → model feature schemas
```

---

## Quick Start

### 1. Database setup (PostgreSQL)

```bash
# Create database and user
psql -U postgres -c "CREATE USER womens_health_app WITH PASSWORD 'yourpassword';"
psql -U postgres -c "CREATE DATABASE womens_health OWNER womens_health_app;"
```

### 2. Backend

```bash
cd backend

# Copy and fill in .env
cp .env.example .env
# Edit .env — set SECRET_KEY and DATABASE_URL at minimum

# Create and activate a virtual environment (recommended)
python3 -m venv venv && source venv/bin/activate

pip install -r requirements.txt

# Run database migrations
python -m alembic upgrade head

# Start the server (dev mode)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.
Swagger docs: `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install   # or pnpm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local

# Development server
npm run dev
```

Frontend at `http://localhost:3000`.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/register` | — | Create account, returns JWT pair |
| POST | `/api/login` | — | Login, returns JWT pair |
| POST | `/api/refresh` | — | Refresh access token |
| POST | `/api/forgot-password` | — | Request password reset email |
| POST | `/api/reset-password` | — | Apply new password via reset token |
| GET | `/api/me` | ✓ | Current user info |
| GET | `/api/user/profile` | ✓ | Full profile |
| PUT | `/api/user/profile` | ✓ | Update name/phone |
| GET | `/api/predict/text/variants` | — | All model variants with metadata |
| GET | `/api/predict/text/schema/{variant_id}` | — | Field schema for a variant |
| POST | `/api/predict/text` | ✓ | Run text prediction |
| POST | `/api/predict/image` | ✓ | Upload acne image for severity prediction |
| GET | `/api/history` | ✓ | All prediction records (text + image) |
| GET | `/api/history/stats` | ✓ | Aggregate statistics |
| DELETE | `/api/history/{id}` | ✓ | Delete a record |
| GET | `/api/report/{id}` | ✓ | Download PDF report for a record |

---

## ML Models

### Text Models (XGBoost)

| Variant | Condition | Features | Accuracy | AUC | Notes |
|---------|-----------|----------|----------|-----|-------|
| `pcos_dataset` | PCOS | 32 qualitative symptoms | 92.7% | 0.975 | Default PCOS model |
| `pcod_v1` | PCOD | 9 numeric/binary | 93.5% | 0.978 | Default PCOD — balanced classes |
| `pcod_v2` | PCOD | 10 (adds BMI category) | 94.6% | 0.974 | Higher accuracy but lower recall on positive class |
| `thyroid_v2` | Thyroid | 17 (symptoms + TSH) | 99.3% | 0.9996 | Default thyroid — needs only TSH |
| `thyroid_preprocessed2` | Thyroid | 40 (full lab panel) | 95.3% | 0.994 | 4-class; use when full labs available |

### Image Model (MobileNetV2)

**Current status: DEGRADED.** The shipped model (`mobilenetv2_skin_severity.keras`) was found to produce near-identical output regardless of input (all outputs ~[0.332, 0.337, 0.331]). The backend detects this automatically and includes a `model_degraded: true` flag in every response.

**To fix:** You need a real labeled acne severity dataset (the source images were not uploaded and aren't available here). With images in place:

```bash
# Place images as:
# image_train/dataset_split/train/{high,low,moderate}/  ← training images
# image_train/dataset_split/test/{high,low,moderate}/   ← test images

# Then retrain (needs internet access for ImageNet weights — ensure connectivity):
cd backend/ml_training/image
python3 train_mobilenetv2.py

# Replace the deployed model:
cp mobilenetv2_skin_severity.keras ../../app/ml/artifacts/image/
```

The `alpha=0.35` and `from-scratch` fallback in the script means you **must** have internet access to `storage.googleapis.com` when running the training script, or it silently trains from scratch (which fails on small datasets). Test with: `curl -s -o /dev/null -w "%{http_code}" https://storage.googleapis.com`.

---

## Security Notes

- Passwords: bcrypt with 12 rounds (direct `bcrypt` library, not passlib — see `security.py`)
- JWT: HS256 with separate access/refresh/reset tokens; password-reset tokens are single-use (tracked in DB)
- SQL injection: SQLAlchemy ORM parameterized queries throughout
- Image uploads: extension whitelist + PIL content verification + server-generated filenames
- CORS: restricted to `CORS_ORIGINS` env var
- No sensitive data is logged; unhandled exceptions return generic 500 messages

---

## Database Schema

```sql
-- users
id VARCHAR(36) PK, name, email UNIQUE, password_hash, phone, created_at, updated_at

-- prediction_history
id VARCHAR(36) PK, user_id FK, prediction_type, model_variant,
input_data JSON, prediction_result, confidence_score, probabilities JSON, created_at

-- acne_image_records
id VARCHAR(36) PK, user_id FK, image_path, severity_result,
confidence_score, probabilities JSON, model_degraded BOOLEAN, created_at

-- password_reset_tokens
id VARCHAR(36) PK, user_id FK, token_jti UNIQUE, used BOOLEAN, created_at
```

Run `python -m alembic upgrade head` to apply. Migrations are in `alembic/versions/`.

---

## Known Limitations & Next Steps

1. **Acne model** must be retrained with real images before it can produce meaningful results (see above).
2. **TSH default value**: the text thyroid model uses TSH=2.5 mIU/L (normal range) when the user hasn't provided a lab value. Consider adding a TSH field to the form for users who have their results.
3. **PCOS model** was trained on a 76%-positive dataset — consider `scale_pos_weight` if you retrain.
4. **Email**: set `EMAIL_ENABLED=true` and configure `SMTP_*` variables for production password reset emails.
5. **PCOD genuine dataset**: the Kaggle PCOS dataset (mislabeled as PCOD in some forks) cannot be used here — a genuine PCOD clinical dataset is needed for a better v3 model.
