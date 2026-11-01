"""
Turns a dict of raw field values (as submitted through the API) into the
exact ordered numeric feature vector a given XGBoost model expects, using
the encoding sidecar JSON captured in ml_training/text_models/capture_encodings.py
(see app/ml/artifacts/text/encodings/*.json).

This module is intentionally the *only* place that knows about per-model
category-to-integer mappings and feature ordering. Every route or service
that wants to run a text prediction goes through `encode_features()` here
rather than building feature arrays by hand, so there is exactly one place
where a mistake in column order or category encoding could exist — and
that place is unit-tested against the values the training scripts actually
produced.
"""
import json
from functools import lru_cache
from pathlib import Path

import numpy as np

from app.ml.registry import TextModelSpec


class UnknownCategoryError(ValueError):
    """Raised when a submitted categorical value isn't one the model was trained on."""

    def __init__(self, field: str, value: str, allowed: list[str]):
        self.field = field
        self.value = value
        self.allowed = allowed
        super().__init__(
            f"Field '{field}' got value {value!r}, which the model was never "
            f"trained on. Allowed values: {allowed}."
        )


class MissingFieldError(ValueError):
    """Raised when a required model feature is absent from the submitted payload."""

    def __init__(self, field: str):
        self.field = field
        super().__init__(f"Required field '{field}' was not provided.")


@lru_cache(maxsize=None)
def _load_encoding(encoding_path: str) -> dict:
    with open(encoding_path) as f:
        return json.load(f)


def load_encoding(spec: "TextModelSpec") -> dict:
    """Public accessor for a model variant's encoding sidecar JSON."""
    return _load_encoding(str(spec.encoding_path))


def encode_features(spec: TextModelSpec, raw_input: dict) -> np.ndarray:
    """
    raw_input: dict of {field_name: value}, where value is either a number
    (for numeric_columns) or a string matching one of the trained category
    labels (for categorical_mappings entries).

    Returns a (1, n_features) float array in the exact column order the
    model was trained on.
    """
    encoding = _load_encoding(str(spec.encoding_path))
    feature_order: list[str] = encoding["feature_order"]
    categorical_mappings: dict[str, dict[str, int]] = encoding["categorical_mappings"]

    row: list[float] = []
    for field in feature_order:
        if field not in raw_input:
            raise MissingFieldError(field)
        value = raw_input[field]

        if field in categorical_mappings:
            mapping = categorical_mappings[field]
            str_value = str(value)
            if str_value not in mapping:
                raise UnknownCategoryError(field, str_value, list(mapping.keys()))
            row.append(float(mapping[str_value]))
        else:
            try:
                row.append(float(value))
            except (TypeError, ValueError) as e:
                raise ValueError(
                    f"Field '{field}' expected a number, got {value!r}"
                ) from e

    return np.array([row], dtype=float)


def get_feature_schema(spec: TextModelSpec) -> dict:
    """
    Returns the full field schema for a given model variant: which fields
    are required, which are numeric vs categorical, and the allowed values
    for categorical fields. Used by GET /api/predict/text/schema/{variant}
    so the frontend can build a correct form without hardcoding field lists
    that could drift out of sync with the actual trained models.
    """
    encoding = _load_encoding(str(spec.encoding_path))
    fields = []
    categorical_mappings = encoding["categorical_mappings"]
    for field in encoding["feature_order"]:
        if field in categorical_mappings:
            fields.append({
                "name": field,
                "type": "categorical",
                "allowed_values": list(categorical_mappings[field].keys()),
            })
        else:
            fields.append({"name": field, "type": "numeric"})
    return {
        "variant_id": spec.variant_id,
        "condition": spec.condition,
        "fields": fields,
        "target_mapping": encoding["target_mapping"],
    }
