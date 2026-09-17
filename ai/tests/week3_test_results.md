# Week 3 AI Test Results

## Test 1 – Retrieved Rule Grounding

Document ID: test-week3  
Version: 1

Input:
- One retrieved rule: rule-001
- No precedents

Result:
- Flag generated successfully.
- Flag references retrieved rule `rule-001`.
- Exact document passage was returned.

Status: PASS

---

## Test 2 – Zero Retrieved Rules

Document ID: test-week3-zero  
Version: 1

Input:
- No retrieved rules
- No precedents

Result:
- No compliance flags were generated.
- Response returned `"flags": []`.

Status: PASS

---

## Test 3 – Precedent Search Context

Document ID: test-week3-precedent  
Version: 1

Input:
- Retrieved rule: rule-001
- One precedent: prec-001

Result:
- Flag generated successfully.
- Flag references retrieved rule `rule-001`.
- Precedent was provided as supporting context.
- Precedent decision was not used as the current document decision.

Status: PASS

---

## Conclusion

The Week 3 AI service successfully constrains compliance flagging to
retrieved rules and accepts precedent search results as supporting
context. When no retrieved rules are provided, the AI generates no
compliance flags.