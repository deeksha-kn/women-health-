"""
Registry describing every trained text-classification model variant: which
condition family it belongs to, where its weights and feature-encoding
sidecar live, and quality metadata captured at training time (see
ml_training/text_models/ for the original scripts that produced these
numbers — accuracy/AUC here are copied from that training run's printed
output, not invented).

There are 5 independently-trained models because the uploaded training
package contained 5 unrelated datasets, not one unified schema:
  - PCOS:    1 variant  (PCOS_DataSet_cleaned.csv)
  - PCOD:    2 variants (pcod_dataset_1.csv.xlsx="v1", pcod_dataset_v2.csv="v2")
  - Thyroid: 2 variants (thyroid_dataset_v2.csv="v2", thyroidDF_preprocessed_2.csv="preprocessed2")

Exposing all 5 (rather than silently picking one) lets the API return a
named `model_variant` on every prediction so it's always traceable which
model produced a given result, and lets a caller request a specific variant
when one is clearly better suited (e.g. preprocessed2 when real lab values
are available, v2 when they aren't).
"""
from dataclasses import dataclass
from pathlib import Path

from app.core.config import settings

ARTIFACTS_DIR = Path(settings.ML_TEXT_MODELS_DIR)


@dataclass(frozen=True)
class TextModelSpec:
    variant_id: str
    condition: str  # "pcos" | "pcod" | "thyroid"
    display_name: str
    model_path: Path
    encoding_path: Path
    n_classes: int
    is_default_for_condition: bool
    # Metadata captured from the original training run's stdout (see
    # ml_training/text_models/train_*.py output), included so API
    # consumers/docs can see real performance numbers rather than nothing.
    training_accuracy: float
    training_auc: float
    notes: str


TEXT_MODEL_REGISTRY: dict[str, TextModelSpec] = {
    "pcos_dataset": TextModelSpec(
        variant_id="pcos_dataset",
        condition="pcos",
        display_name="PCOS (qualitative symptoms)",
        model_path=ARTIFACTS_DIR / "pcos_dataset_xgb.json",
        encoding_path=ARTIFACTS_DIR / "encodings" / "pcos_dataset.json",
        n_classes=2,
        is_default_for_condition=True,
        training_accuracy=0.9265,
        training_auc=0.9754,
        notes=(
            "Trained on 676 rows of real qualitative symptom data. Target "
            "distribution is imbalanced (76% positive class), so a 'No PCOS' "
            "prediction is statistically the rarer/more confident-worthy call."
        ),
    ),
    "pcod_v1": TextModelSpec(
        variant_id="pcod_v1",
        condition="pcod",
        display_name="PCOD (v1 — balanced synthetic)",
        model_path=ARTIFACTS_DIR / "pcod_v1_xgb.json",
        encoding_path=ARTIFACTS_DIR / "encodings" / "pcod_v1.json",
        n_classes=2,
        is_default_for_condition=True,
        training_accuracy=0.9350,
        training_auc=0.9775,
        notes=(
            "Trained on 3000 rows, fairly balanced classes (37% positive). "
            "Set as the default PCOD variant because its more balanced "
            "training distribution gives more even precision/recall across "
            "both classes than v2 (see pcod_v2 notes)."
        ),
    ),
    "pcod_v2": TextModelSpec(
        variant_id="pcod_v2",
        condition="pcod",
        display_name="PCOD (v2 — adds BMI category, imbalanced)",
        model_path=ARTIFACTS_DIR / "pcod_v2_xgb.json",
        encoding_path=ARTIFACTS_DIR / "encodings" / "pcod_v2.json",
        n_classes=2,
        is_default_for_condition=False,
        training_accuracy=0.9463,
        training_auc=0.9740,
        notes=(
            "Trained on 4000 rows. Higher raw accuracy than v1, but classes "
            "are more imbalanced (10% positive), giving lower recall (0.67) "
            "on the positive PCOD class specifically. Includes bmi_category "
            "as an extra feature v1 doesn't have."
        ),
    ),
    "thyroid_v2": TextModelSpec(
        variant_id="thyroid_v2",
        condition="thyroid",
        display_name="Thyroid (v2 — symptoms + TSH only)",
        model_path=ARTIFACTS_DIR / "thyroid_v2_xgb.json",
        encoding_path=ARTIFACTS_DIR / "encodings" / "thyroid_v2.json",
        n_classes=3,
        is_default_for_condition=True,
        training_accuracy=0.9925,
        training_auc=0.9996,
        notes=(
            "Trained on 4000 rows with one real lab value (TSH) plus "
            "symptom flags. Default thyroid variant because it only needs "
            "TSH (a single common test), not the full lab panel "
            "preprocessed2 requires, making it usable by more patients."
        ),
    ),
    "thyroid_preprocessed2": TextModelSpec(
        variant_id="thyroid_preprocessed2",
        condition="thyroid",
        display_name="Thyroid (preprocessed2 — full lab panel, 4-class)",
        model_path=ARTIFACTS_DIR / "thyroid_preprocessed2_xgb.json",
        encoding_path=ARTIFACTS_DIR / "encodings" / "thyroid_preprocessed2.json",
        n_classes=4,
        is_default_for_condition=False,
        training_accuracy=0.9531,
        training_auc=0.9941,
        notes=(
            "Trained on 9172 rows of real clinical lab data (TSH, T3, TT4, "
            "T4U, FTI) plus medical history flags. Distinguishes "
            "hyper/hypo/negative/'other' (4 classes) rather than "
            "hyper/hypo/normal (3 classes). Use when the patient has a full "
            "thyroid lab panel available; otherwise thyroid_v2 needs only TSH."
        ),
    ),
}


def get_default_variant(condition: str) -> TextModelSpec:
    for spec in TEXT_MODEL_REGISTRY.values():
        if spec.condition == condition and spec.is_default_for_condition:
            return spec
    raise ValueError(f"No default text model registered for condition={condition!r}")


def get_variant(variant_id: str) -> TextModelSpec:
    if variant_id not in TEXT_MODEL_REGISTRY:
        raise ValueError(f"Unknown model variant_id={variant_id!r}")
    return TEXT_MODEL_REGISTRY[variant_id]


def list_variants_for_condition(condition: str) -> list[TextModelSpec]:
    return [s for s in TEXT_MODEL_REGISTRY.values() if s.condition == condition]
