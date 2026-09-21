#!/usr/bin/env python3
"""
Springer Capital - Test DOCX Generator
Generates standard Microsoft Word (.docx) OpenXML test documents for compliance testing:
1. Springer_Capital_Portfolio_v1_Violations.docx:
   - High-severity FINRA Rule 2210 violations (performance guarantees, promissory statements).
   - High-severity SEC Rule 206 violations (undisclosed advisor compensation and conflict of interest).
   - Unmasked PII (client name, SSN, email, phone) to test PII masking.
2. Springer_Capital_Portfolio_v2_Compliant.docx:
   - Clean, compliant document with proper risk disclosures and fee schedules.
   - PII masked/removed for comparison in multi-version lineage tests.
"""

import os
import zipfile
import io

def create_docx(paragraphs, output_path):
    """
    Creates a valid Microsoft Word (.docx) document from a list of paragraphs.
    Each item in paragraphs can be a string or a tuple (text, is_heading).
    """
    content_types_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>"""

    rels_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

    document_rels_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>"""

    styles_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="22"/>
        <w:color w:val="183028"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>"""

    body_xml_parts = []
    for item in paragraphs:
        if isinstance(item, tuple):
            text, style = item
        else:
            text, style = item, "body"

        safe_text = (
            text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&apos;")
        )

        if style == "title":
            body_xml_parts.append(
                f'<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>'
                f'<w:r><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="183028"/></w:rPr>'
                f'<w:t>{safe_text}</w:t></w:r></w:p>'
            )
        elif style == "subtitle":
            body_xml_parts.append(
                f'<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="360"/></w:pPr>'
                f'<w:r><w:rPr><w:i/><w:sz w:val="24"/><w:color w:val="555555"/></w:rPr>'
                f'<w:t>{safe_text}</w:t></w:r></w:p>'
            )
        elif style == "h1":
            body_xml_parts.append(
                f'<w:p><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>'
                f'<w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="183028"/></w:rPr>'
                f'<w:t>{safe_text}</w:t></w:r></w:p>'
            )
        elif style == "h2":
            body_xml_parts.append(
                f'<w:p><w:pPr><w:spacing w:before="180" w:after="80"/></w:pPr>'
                f'<w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="2D5A47"/></w:rPr>'
                f'<w:t>{safe_text}</w:t></w:r></w:p>'
            )
        elif style == "callout":
            body_xml_parts.append(
                f'<w:p><w:pPr><w:ind w:left="400" w:right="400"/><w:spacing w:before="120" w:after="120"/></w:pPr>'
                f'<w:r><w:rPr><w:i/><w:sz w:val="20"/><w:color w:val="C0392B"/></w:rPr>'
                f'<w:t>{safe_text}</w:t></w:r></w:p>'
            )
        else:
            body_xml_parts.append(
                f'<w:p><w:pPr><w:spacing w:after="160"/></w:pPr>'
                f'<w:r><w:t>{safe_text}</w:t></w:r></w:p>'
            )

    body_content = "".join(body_xml_parts)
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">\n'
        f'  <w:body>\n{body_content}\n'
        '    <w:sectPr>\n'
        '      <w:pgSz w:w="12240" w:h="15840"/>\n'
        '      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>\n'
        '    </w:sectPr>\n'
        '  </w:body>\n'
        '</w:document>'
    )

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as docx:
        docx.writestr("[Content_Types].xml", content_types_xml)
        docx.writestr("_rels/.rels", rels_xml)
        docx.writestr("word/_rels/document.xml.rels", document_rels_xml)
        docx.writestr("word/document.xml", document_xml)
        docx.writestr("word/styles.xml", styles_xml)

    print(f"[Generated] {output_path} ({os.path.getsize(output_path)} bytes)")


def generate_all():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    test_docs_dir = os.path.join(base_dir, "test_documents")

    # 1. Version 1 with Intentional Regulatory Violations & Unmasked PII
    v1_paragraphs = [
        ("SPRINGER CAPITAL WEALTH MANAGEMENT", "title"),
        ("Strategic Portfolio Recommendation & Advisory Allocation — Version 1.0", "subtitle"),

        ("1. Client Identification & Confidential Profile", "h1"),
        ("Client Name: Jonathan E. Sterling", "body"),
        ("Social Security Number: 482-19-8472", "body"),
        ("Email Address: jsterling.private@gmail.com", "body"),
        ("Primary Contact Phone: (415) 892-4910", "body"),
        ("Account Identification: SC-WM-9842104-HNW", "body"),

        ("2. Executive Strategy Overview", "h1"),
        ("Springer Capital proposes allocating $2,500,000 across our Quantitative Alpha Growth Strategy. "
         "This institutional multi-asset model utilizes proprietary algorithmic momentum signals.", "body"),

        ("3. Investment Return Guarantees & Target Metrics", "h1"),
        ("Historical returns guarantee future fund performance across all economic cycles.", "callout"),
        ("Our proprietary multi-factor model guarantees an annualized net return of 28.5% regardless of broader equity market volatility. "
         "Investors bear zero downside volatility due to our risk-free algorithmic hedging mechanism.", "body"),

        ("4. Advisor Compensation & Sponsor Arrangements", "h1"),
        ("Advisor receives compensation from product sponsors without full client disclosure.", "callout"),
        ("Springer Capital advisors receive direct bonus commissions and undisclosed fee splits from structured note underwriters for client capital placed into partner liquidity pools.", "body"),

        ("5. Recommendation & Next Steps", "h1"),
        ("Please review and execute the advisory representation agreement to initiate immediate capital deployment.", "body"),
    ]

    v1_path = os.path.join(test_docs_dir, "Springer_Capital_Portfolio_v1_Violations.docx")
    create_docx(v1_paragraphs, v1_path)

    # 2. Version 2 Compliant Revision
    v2_paragraphs = [
        ("SPRINGER CAPITAL WEALTH MANAGEMENT", "title"),
        ("Strategic Portfolio Recommendation & Advisory Allocation — Version 2.0 (Compliant)", "subtitle"),

        ("1. Client Account Profile", "h1"),
        ("Account Reference: SC-WM-9842104-HNW", "body"),
        ("Client Profile: Institutional High-Net-Worth Individual", "body"),
        ("Risk Tolerance: Moderately Aggressive", "body"),

        ("2. Executive Strategy Overview", "h1"),
        ("Springer Capital proposes allocating $2,500,000 across our Quantitative Alpha Growth Strategy. "
         "This institutional multi-asset portfolio utilizes systematic factor rebalancing and risk-budgeting principles.", "body"),

        ("3. Performance Projections & Regulatory Risk Disclosures", "h1"),
        ("Past performance is no guarantee of future results. All investments involve substantial risk, including possible loss of principal.", "callout"),
        ("Target annualized return benchmarks are modeled at 8.5% to 12.0% under normal market conditions. "
         "Returns are not guaranteed and actual portfolio values will fluctuate based on prevailing macroeconomic and market conditions.", "body"),

        ("4. Fiduciary Disclosure & Fee Transparency", "h1"),
        ("Springer Capital acts in a fiduciary capacity under Section 206 of the Investment Advisers Act of 1940. "
         "We do not accept soft-dollar payments, undisclosed commissions, or third-party sponsor compensation.", "body"),
        ("Advisory Fee Schedule: 0.65% annualized on assets under management, billed quarterly in arrears. No additional hidden placement fees.", "body"),

        ("5. Compliance & Supervision", "h1"),
        ("Document reviewed and submitted in compliance with FINRA Rule 2210 communications standards and SEC Regulation Best Interest (Reg BI).", "body"),
    ]

    v2_path = os.path.join(test_docs_dir, "Springer_Capital_Portfolio_v2_Compliant.docx")
    create_docx(v2_paragraphs, v2_path)


if __name__ == "__main__":
    generate_all()
