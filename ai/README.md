
# AI Service

This folder contains the AI service for the Compliance Document Review application.

## Features

- Generates a concise compliance-focused document summary.
- Identifies potential compliance issues.
- Returns flagged passages with explanations.
- Uses Gemini for AI analysis.
- Accepts masked document text to protect PII.

## Project Structure

```text
ai/
├── app/
│   └── main.py
├── prompts/
│   ├── summary_prompt.txt
│   └── issue_flagging_prompt.txt
├── tests/
│   └── summary_test_results.md
├── requirements.txt
└── README.md