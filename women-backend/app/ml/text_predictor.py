"""
Loads trained XGBoost models on first use (and caches them in memory) and
runs predictions through the feature encoder defined in feature_encoder.py.
"""
import json
from functools import lru_cache

import numpy as np
import xgboost as xgb

from app.ml.feature_encoder import encode_features, load_encoding
from app.ml.registry import TextModelSpec, get_default_variant, get_variant


@lru_cache(maxsize=None)
def _load_model(model_path: str) -> xgb.XGBClassifier:
    model = xgb.XGBClassifier()
    model.load_model(model_path)
    return model


class TextPredictionResult:
    def __init__(
        self,
        variant_id: str,
        condition: str,
        predicted_label: str,
        confidence_score: float,
        probabilities: dict[str, float],
    ):
        self.variant_id = variant_id
        self.condition = condition
        self.predicted_label = predicted_label
        self.confidence_score = confidence_score  # 0-100
        self.probabilities = probabilities  # {label: 0-1}

    def to_dict(self) -> dict:
        return {
            "model_variant": self.variant_id,
            "condition": self.condition,
            "prediction": self.predicted_label,
            "confidence_score": round(self.confidence_score, 2),
            "probabilities": {k: round(v, 4) for k, v in self.probabilities.items()},
        }


def predict_text(raw_input: dict, condition: str, variant_id: str | None = None) -> TextPredictionResult:
    """
    condition: "pcos" | "pcod" | "thyroid"
    variant_id: specific model to use (e.g. "pcod_v2"). If omitted, the
    registry's default variant for that condition is used.
    """
    spec: TextModelSpec = get_variant(variant_id) if variant_id else get_default_variant(condition)
    if spec.condition != condition:
        raise ValueError(
            f"Model variant '{spec.variant_id}' belongs to condition "
            f"'{spec.condition}', not '{condition}'."
        )

    features = encode_features(spec, raw_input)
    model = _load_model(str(spec.model_path))
    proba = model.predict_proba(features)[0]  # shape (n_classes,)

    encoding = load_encoding(spec)
    target_mapping: dict[str, str] = encoding["target_mapping"]
    # target_mapping keys are class indices as strings, e.g. {"0": "hyperthyroid", ...}
    class_labels = [target_mapping[str(i)] for i in range(len(proba))]

    probabilities = {label: float(p) for label, p in zip(class_labels, proba)}
    top_idx = int(np.argmax(proba))
    predicted_label = class_labels[top_idx]
    confidence_score = float(proba[top_idx]) * 100

    return TextPredictionResult(
        variant_id=spec.variant_id,
        condition=condition,
        predicted_label=predicted_label,
        confidence_score=confidence_score,
        probabilities=probabilities,
    )
