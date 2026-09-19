"""
pii_masker.py
--------------
DevOps Week 2 — Deterministic Server-Side PII Masking Engine.

Strips and replaces Personally Identifiable Information (PII) such as:
  - Names ([NAME_1], [NAME_2], ...)
  - Social Security Numbers ([SSN_1], [SSN_2], ...)
  - Email addresses ([EMAIL_1], [EMAIL_2], ...)
  - Phone numbers ([PHONE_1], [PHONE_2], ...)
  - Financial account & credit card numbers ([ACCOUNT_1], ...)
  - Physical addresses & ZIP codes ([ADDRESS_1], ...)

Guarantees:
  1. Deterministic & Consistent: The same PII entity across a document or session receives the same placeholder tag.
  2. Idempotent: Already masked tags (e.g. [NAME_1], [EMAIL_1]) are preserved and never double-masked.
  3. Context-Aware & Noise-Filtered: Financial/legal stop words (e.g. "Springer Capital", "FINRA Rule", "January")
     are not incorrectly classified as personal names.
"""

import re
from typing import Any, Dict, List, Optional, Set, Tuple


# Non-name words commonly found in financial/compliance documents
STOPWORDS: Set[str] = {
    "Springer", "Capital", "Compliance", "Document", "Review", "Securities",
    "Exchange", "Commission", "Financial", "Industry", "Regulatory", "Authority",
    "Rule", "Section", "Article", "Table", "Report", "Audit", "Account",
    "Investment", "Fund", "Advisor", "Officer", "User", "Admin", "Page",
    "Version", "Date", "Status", "Pending", "Approved", "Rejected", "Revision",
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December",
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    "United", "States", "America", "New", "York", "San", "Francisco", "London",
    "Dear", "Please", "Thank", "Thanks", "Regards", "Sincerely", "Best", "Yours",
    "Agreement", "Terms", "Conditions", "Policy", "Privacy", "Notice", "Form",
    "Federal", "State", "Public", "Internal", "Confidential", "Management",
    "Services", "Portfolio", "Asset", "Wealth", "Equity", "Fixed", "Income",
    "Routing", "Number", "Card", "Bank", "Wire", "Transfer", "Credit", "Debit"
}


class PiiMasker:
    """
    High-performance PII masking engine with deterministic entity mapping.
    """

    # Email pattern (RFC 5322 compliant subset)
    EMAIL_PATTERN = re.compile(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b',
        re.IGNORECASE
    )

    # Social Security Numbers: 000-00-0000 or 000 00 0000 or labeled 9-digits
    SSN_PATTERN = re.compile(
        r'(?:\b\d{3}[-\s./]\d{2}[-\s./]\d{4}\b)|(?:(?i:ssn|social\s+security(?:\s+number)?|ss#)[\s:]*(\b\d{9}\b|\b\d{3}[-\s./]\d{2}[-\s./]\d{4}\b))'
    )

    # Phone numbers: US and international formats
    PHONE_PATTERN = re.compile(
        r'(?:\+?1[-.\s]?)?(?:\([0-9]{3}\)|[0-9]{3})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b'
    )

    # Credit card / 13-19 digit financial account numbers
    CARD_PATTERN = re.compile(
        r'\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{4}[-\s]?\d{6}[-\s]?\d{5}\b'
    )

    # Labeled account numbers (supports 'Account Number:', 'Routing Number:', 'Acct #', etc.)
    ACCOUNT_LABEL_PATTERN = re.compile(
        r'(?i:\b(?:account|acct|routing)(?:\s+number|\s+#)?[\s:]+)([A-Za-z0-9\-]{6,20})\b'
    )

    # Physical street address pattern
    STREET_ADDRESS_PATTERN = re.compile(
        r'\b\d{1,5}\s+[A-Z][a-zA-Z0-9\.\s]{2,25}\s+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Plaza|Plz|Suite|Ste|Apt)\b\.?',
        re.IGNORECASE
    )

    # Contextual name prefixes (e.g. "Mr. John Doe", "Dr. Jane Smith")
    PREFIXED_NAME_PATTERN = re.compile(
        r'\b(?:Mr\.|Mrs\.|Ms\.|Miss|Dr\.|Prof\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b'
    )

    # Salutation or label based names (e.g. "Dear John Doe,", "Advisor: John Doe", "Client: Jane Smith")
    SALUTATION_NAME_PATTERN = re.compile(
        r'(?i:\b(?:dear|attn:|attention:|advisor:|client:|customer:|applicant:|investor:)\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})'
    )

    # General capitalized 2-word proper name candidate pattern
    FULL_NAME_PATTERN = re.compile(
        r'\b([A-Z][a-z]{1,15}\s+[A-Z][a-z]{1,15})\b'
    )

    # Existing placeholder protector pattern (e.g. [NAME_1], [EMAIL_1])
    EXISTING_PLACEHOLDER_PATTERN = re.compile(
        r'(\[(?:NAME|EMAIL|SSN|PHONE|ACCOUNT|CARD|ADDRESS|ZIP|DATE)_[0-9]+\])'
    )

    def __init__(self):
        self.reset()

    def reset(self) -> None:
        """Reset entity tracking counters and mappings for a new context."""
        self.entity_map: Dict[str, str] = {}
        self.counters: Dict[str, int] = {
            "NAME": 0,
            "EMAIL": 0,
            "SSN": 0,
            "PHONE": 0,
            "ACCOUNT": 0,
            "CARD": 0,
            "ADDRESS": 0,
        }

    def _get_placeholder(self, entity_type: str, raw_value: str) -> str:
        """
        Get existing placeholder for an entity or allocate the next sequential tag.
        Ensures deterministic consistency.
        """
        key = f"{entity_type}:{raw_value.strip().lower()}"
        if key not in self.entity_map:
            self.counters[entity_type] += 1
            self.entity_map[key] = f"[{entity_type}_{self.counters[entity_type]}]"
        return self.entity_map[key]

    def _is_valid_name(self, candidate: str) -> bool:
        """Filter out non-name proper nouns, stopwords, and existing tags."""
        words = candidate.strip().split()
        if not words or len(words) > 3:
            return False
        
        # Check if all words are titlecased
        for word in words:
            clean_word = re.sub(r'[^A-Za-z]', '', word)
            if not clean_word or not clean_word[0].isupper():
                return False
            if clean_word in STOPWORDS:
                return False
        return True

    def mask_text(self, text: str) -> str:
        """
        Mask all PII in raw text string while preserving document structure.
        """
        if not text:
            return ""

        # Step 0: Temporarily protect existing placeholders so they are not altered
        protected_placeholders: Dict[str, str] = {}
        def protect_existing(match):
            token = f"__PII_PROTECTED_{len(protected_placeholders)}__"
            protected_placeholders[token] = match.group(1)
            return token

        working_text = self.EXISTING_PLACEHOLDER_PATTERN.sub(protect_existing, text)

        # Step 1: Emails (precise pattern)
        def replace_email(match):
            raw = match.group(0)
            return self._get_placeholder("EMAIL", raw)
        working_text = self.EMAIL_PATTERN.sub(replace_email, working_text)

        # Step 2: SSNs
        def replace_ssn(match):
            raw = match.group(1) if match.group(1) else match.group(0)
            clean_raw = re.sub(r'[^\d]', '', raw)
            if len(clean_raw) == 9:
                placeholder = self._get_placeholder("SSN", clean_raw)
                return match.group(0).replace(raw, placeholder)
            return match.group(0)
        working_text = self.SSN_PATTERN.sub(replace_ssn, working_text)

        # Step 3: Credit Card / Account Numbers
        def replace_card(match):
            raw = match.group(0)
            digits = re.sub(r'\D', '', raw)
            if 13 <= len(digits) <= 19:
                return self._get_placeholder("CARD", digits)
            return raw
        working_text = self.CARD_PATTERN.sub(replace_card, working_text)

        def replace_account_label(match):
            account_num = match.group(1)
            placeholder = self._get_placeholder("ACCOUNT", account_num)
            return match.group(0).replace(account_num, placeholder)
        working_text = self.ACCOUNT_LABEL_PATTERN.sub(replace_account_label, working_text)

        # Step 4: Phone Numbers (ensure not mistaken for SSN or card)
        def replace_phone(match):
            raw = match.group(0).strip()
            digits = re.sub(r'\D', '', raw)
            if 10 <= len(digits) <= 11 and not raw.startswith("["):
                return self._get_placeholder("PHONE", digits)
            return raw
        working_text = self.PHONE_PATTERN.sub(replace_phone, working_text)

        # Step 5: Physical Street Addresses
        def replace_address(match):
            raw = match.group(0).strip()
            return self._get_placeholder("ADDRESS", raw)
        working_text = self.STREET_ADDRESS_PATTERN.sub(replace_address, working_text)

        # Step 6: Contextual Salutation Names (e.g. "Dear John Doe,")
        def replace_salutation(match):
            full_match = match.group(0)
            name_part = match.group(1)
            if self._is_valid_name(name_part):
                placeholder = self._get_placeholder("NAME", name_part)
                return full_match.replace(name_part, placeholder)
            return full_match
        working_text = self.SALUTATION_NAME_PATTERN.sub(replace_salutation, working_text)

        # Step 7: Prefixed Names (e.g. "Mr. John Smith", "Dr. Jane Doe")
        def replace_prefixed_name(match):
            name_part = match.group(1)
            if self._is_valid_name(name_part):
                placeholder = self._get_placeholder("NAME", name_part)
                return match.group(0).replace(name_part, placeholder)
            return match.group(0)
        working_text = self.PREFIXED_NAME_PATTERN.sub(replace_prefixed_name, working_text)

        # Step 8: General 2-word proper names (filtered against stopwords)
        def replace_full_name(match):
            raw = match.group(1)
            if self._is_valid_name(raw):
                return self._get_placeholder("NAME", raw)
            return raw
        working_text = self.FULL_NAME_PATTERN.sub(replace_full_name, working_text)

        # Step 9: Restore protected existing placeholders
        for token, original in protected_placeholders.items():
            working_text = working_text.replace(token, original)

        return working_text

    def mask_document(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a structured document payload matching the platform contract.
        
        Input:
            {
                "document_id": "doc-001",
                "version": 1,
                "text": "Dear John Doe, please contact john.doe@example.com...",
                // (or "masked_text" / "raw_text")
            }
            
        Output:
            {
                "document_id": "doc-001",
                "version": 1,
                "masked_text": "Dear [NAME_1], please contact [EMAIL_1]..."
            }
        """
        document_id = str(payload.get("document_id", "unknown"))
        version = int(payload.get("version", 1))

        # Extract text from any of the standard payload keys
        raw_text = (
            payload.get("text") or 
            payload.get("raw_text") or 
            payload.get("content") or 
            payload.get("masked_text") or 
            ""
        )

        masked_text = self.mask_text(str(raw_text))

        return {
            "document_id": document_id,
            "version": version,
            "masked_text": masked_text,
        }


# Convenience module-level singleton function
_default_masker = PiiMasker()


def mask_pii(text: str) -> str:
    """Convenience helper to mask a single string."""
    masker = PiiMasker()
    return masker.mask_text(text)


def mask_document_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience helper to process a document dictionary."""
    masker = PiiMasker()
    return masker.mask_document(payload)
