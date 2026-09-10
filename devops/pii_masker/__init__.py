import os
import sys
from pathlib import Path

# Add pii-masker to sys.path
_PII_MASKER_DIR = Path(__file__).resolve().parent.parent / "pii-masker"
if str(_PII_MASKER_DIR) not in sys.path:
    sys.path.insert(0, str(_PII_MASKER_DIR))

from pii_masker import PiiMasker, mask_pii, mask_document_payload

__all__ = ["PiiMasker", "mask_pii", "mask_document_payload"]
