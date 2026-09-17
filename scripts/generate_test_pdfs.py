import os
import subprocess
import tempfile

V1_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: letter;
    margin: 18mm 16mm 18mm 16mm;
  }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.5;
    font-size: 11pt;
    margin: 0;
  }
  .header-table {
    width: 100%;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 8px;
    margin-bottom: 16px;
  }
  .firm-name {
    font-size: 16pt;
    font-weight: 800;
    color: #042f2e;
    letter-spacing: 0.5px;
  }
  .sub-firm {
    font-size: 9pt;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }
  .ref-box {
    text-align: right;
    font-size: 8.5pt;
    color: #475569;
    font-family: monospace;
  }
  .badge-danger {
    display: inline-block;
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #f87171;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 8.5pt;
    font-weight: 700;
  }
  h1 {
    font-size: 14pt;
    color: #0f172a;
    margin: 12px 0 6px 0;
    font-weight: 700;
  }
  h2 {
    font-size: 11pt;
    color: #1e293b;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 4px;
    margin-top: 14px;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .meta-grid {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
  }
  .meta-grid td {
    padding: 6px 10px;
    font-size: 9pt;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }
  .meta-label {
    color: #64748b;
    font-weight: 600;
    width: 25%;
  }
  .meta-value {
    color: #0f172a;
    font-weight: 500;
  }
  .allocation-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px 0;
  }
  .allocation-table th {
    background: #0f172a;
    color: #ffffff;
    font-size: 8.5pt;
    text-transform: uppercase;
    padding: 6px 8px;
    text-align: left;
    letter-spacing: 0.5px;
  }
  .allocation-table td {
    padding: 5px 8px;
    font-size: 9pt;
    border-bottom: 1px solid #e2e8f0;
  }
  .allocation-table tr:nth-child(even) td {
    background: #f8fafc;
  }
  .callout-box {
    background: #fffbeb;
    border-left: 4px solid #f59e0b;
    padding: 10px 12px;
    margin: 12px 0;
    font-size: 9pt;
    color: #92400e;
  }
  .signatures {
    margin-top: 20px;
    width: 100%;
  }
  .sig-line {
    border-top: 1px solid #94a3b8;
    padding-top: 4px;
    font-size: 8.5pt;
    color: #475569;
  }
</style>
</head>
<body>

<table class="header-table">
  <tr>
    <td>
      <div class="firm-name">SPRINGER CAPITAL</div>
      <div class="sub-firm">Private Wealth Management &bull; Advisory Services</div>
    </td>
    <td class="ref-box">
      <div><strong>FILING:</strong> SC-2026-PROP-8812</div>
      <div><strong>STATUS:</strong> INITIAL SUBMISSION (v1)</div>
      <div><strong>DATE:</strong> September 12, 2026</div>
    </td>
  </tr>
</table>

<h1>Strategic Asset Allocation &amp; Portfolio Growth Proposal</h1>
<p style="font-size: 9pt; color: #64748b; margin-top: -4px;">Confidential Investment Fiduciary Plan &bull; Prepared exclusively for client onboarding review</p>

<table class="meta-grid">
  <tr>
    <td class="meta-label">Client Legal Name:</td>
    <td class="meta-value"><strong>Jonathan E. Sterling</strong></td>
    <td class="meta-label">Social Security No:</td>
    <td class="meta-value"><strong>455-82-9012</strong></td>
  </tr>
  <tr>
    <td class="meta-label">Client Contact:</td>
    <td class="meta-value">(212) 555-0184 | jsterling@apexcapital-partners.com</td>
    <td class="meta-label">Custodial Account:</td>
    <td class="meta-value">ACCT-789201948</td>
  </tr>
  <tr>
    <td class="meta-label">Residential Address:</td>
    <td class="meta-value">742 Park Avenue, Penthouse B, New York, NY 10021</td>
    <td class="meta-label">Submitting Advisor:</td>
    <td class="meta-value">Marcus Vance (CRD #449120)</td>
  </tr>
</table>

<h2>1. Executive Portfolio Mandate &amp; Return Objectives</h2>
<p>
  Springer Capital Wealth Management is pleased to present this custom growth strategy tailored specifically for Jonathan E. Sterling. Our multi-asset quantitative strategy targets accelerated capital compounding through asymmetric tactical exposures.
</p>
<p>
  Our proprietary Quantitative Alpha Options Strategy guarantees an annualized net return of 26.5% with zero risk to principal. Under this mandate, advanced algorithmic hedging shields all assets against downward price shocks, ensuring that the client will never experience a negative quarterly return regardless of market downturns.
</p>

<h2>2. Recommended Asset Allocation ($10,000,000 Mandate)</h2>
<table class="allocation-table">
  <thead>
    <tr>
      <th>Asset Class / Strategy</th>
      <th>Target Allocation</th>
      <th>Capital Amount</th>
      <th>Benchmark Expected Return</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>US Large Cap Growth Equity</td>
      <td>40.0%</td>
      <td>$4,000,000</td>
      <td>S&amp;P 500 Index</td>
    </tr>
    <tr>
      <td>Quantitative Alpha Options Overlay</td>
      <td>25.0%</td>
      <td>$2,500,000</td>
      <td>Guaranteed 26.5% Absolute Yield</td>
    </tr>
    <tr>
      <td>Private Credit &amp; Mezzanine Debt</td>
      <td>20.0%</td>
      <td>$2,000,000</td>
      <td>SOFR + 650 bps</td>
    </tr>
    <tr>
      <td>Opportunistic Global Macro</td>
      <td>10.0%</td>
      <td>$1,000,000</td>
      <td>HFRI Macro Index</td>
    </tr>
    <tr>
      <td>Treasuries &amp; Cash Equivalents</td>
      <td>5.0%</td>
      <td>$500,000</td>
      <td>US 3-Month T-Bill</td>
    </tr>
    <tr style="font-weight: bold; background: #e2e8f0;">
      <td>Total Portfolio Commitment</td>
      <td>100.0%</td>
      <td>$10,000,000</td>
      <td>Target Guaranteed Benchmark</td>
    </tr>
  </tbody>
</table>

<h2>3. Risk Disclosures &amp; Statutory Declarations</h2>
<p>
  Backtested historical performance from 2019 through 2025 demonstrates that our strategy never suffers drawdown, ensuring consistent profits in all market regimes. Past performance guarantees future profits under all economic conditions.
</p>
<p>
  Investing involves minimal oversight. Because this customized portfolio utilizes private fiduciary trusts, it is fully exempt from regular compliance audits and SEC marketing scrutiny.
</p>

<table class="signatures">
  <tr>
    <td style="width: 45%;">
      <div class="sig-line">
        <strong>Marcus Vance, CFP</strong><br>
        Managing Director &bull; Private Client Advisory<br>
        CRD #449120 &bull; Springer Capital
      </div>
    </td>
    <td style="width: 10%;"></td>
    <td style="width: 45%;">
      <div class="sig-line">
        <strong>Jonathan E. Sterling</strong><br>
        Client Principal &bull; Account ACCT-789201948<br>
        Acknowledged: September 12, 2026
      </div>
    </td>
  </tr>
</table>

</body>
</html>
"""

V2_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: letter;
    margin: 18mm 16mm 18mm 16mm;
  }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.5;
    font-size: 11pt;
    margin: 0;
  }
  .header-table {
    width: 100%;
    border-bottom: 2px solid #064e3b;
    padding-bottom: 8px;
    margin-bottom: 16px;
  }
  .firm-name {
    font-size: 16pt;
    font-weight: 800;
    color: #064e3b;
    letter-spacing: 0.5px;
  }
  .sub-firm {
    font-size: 9pt;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }
  .ref-box {
    text-align: right;
    font-size: 8.5pt;
    color: #475569;
    font-family: monospace;
  }
  .badge-success {
    display: inline-block;
    background: #ecfdf5;
    color: #065f46;
    border: 1px solid #34d399;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 8.5pt;
    font-weight: 700;
  }
  h1 {
    font-size: 14pt;
    color: #0f172a;
    margin: 12px 0 6px 0;
    font-weight: 700;
  }
  h2 {
    font-size: 11pt;
    color: #1e293b;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 4px;
    margin-top: 14px;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .meta-grid {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
  }
  .meta-grid td {
    padding: 6px 10px;
    font-size: 9pt;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }
  .meta-label {
    color: #64748b;
    font-weight: 600;
    width: 25%;
  }
  .meta-value {
    color: #0f172a;
    font-weight: 500;
  }
  .allocation-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px 0;
  }
  .allocation-table th {
    background: #064e3b;
    color: #ffffff;
    font-size: 8.5pt;
    text-transform: uppercase;
    padding: 6px 8px;
    text-align: left;
    letter-spacing: 0.5px;
  }
  .allocation-table td {
    padding: 5px 8px;
    font-size: 9pt;
    border-bottom: 1px solid #e2e8f0;
  }
  .allocation-table tr:nth-child(even) td {
    background: #f8fafc;
  }
  .disclosure-box {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-left: 4px solid #0f172a;
    padding: 10px 12px;
    margin: 12px 0;
    font-size: 8.5pt;
    color: #334155;
    line-height: 1.45;
  }
  .signatures {
    margin-top: 20px;
    width: 100%;
  }
  .sig-line {
    border-top: 1px solid #94a3b8;
    padding-top: 4px;
    font-size: 8.5pt;
    color: #475569;
  }
</style>
</head>
<body>

<table class="header-table">
  <tr>
    <td>
      <div class="firm-name">SPRINGER CAPITAL</div>
      <div class="sub-firm">Private Wealth Management &bull; Compliance Reviewed</div>
    </td>
    <td class="ref-box">
      <div><strong>FILING:</strong> SC-2026-PROP-8812</div>
      <div><strong>STATUS:</strong> REVISED AMENDMENT (v2)</div>
      <div><strong>DATE:</strong> September 13, 2026</div>
    </td>
  </tr>
</table>

<h1>Strategic Asset Allocation &amp; Portfolio Growth Proposal (Amended)</h1>
<p style="font-size: 9pt; color: #64748b; margin-top: -4px;">Compliant Investment Fiduciary Plan &bull; FINRA Rule 2210 &amp; SEC Rule 206(4)-1 Standard</p>

<table class="meta-grid">
  <tr>
    <td class="meta-label">Client Legal Name:</td>
    <td class="meta-value"><strong>Jonathan E. Sterling</strong></td>
    <td class="meta-label">Social Security No:</td>
    <td class="meta-value"><strong>455-82-9012</strong></td>
  </tr>
  <tr>
    <td class="meta-label">Client Contact:</td>
    <td class="meta-value">(212) 555-0184 | jsterling@apexcapital-partners.com</td>
    <td class="meta-label">Custodial Account:</td>
    <td class="meta-value">ACCT-789201948</td>
  </tr>
  <tr>
    <td class="meta-label">Residential Address:</td>
    <td class="meta-value">742 Park Avenue, Penthouse B, New York, NY 10021</td>
    <td class="meta-label">Submitting Advisor:</td>
    <td class="meta-value">Marcus Vance (CRD #449120)</td>
  </tr>
</table>

<h2>1. Executive Portfolio Mandate &amp; Investment Objectives</h2>
<p>
  Springer Capital Wealth Management is pleased to present this revised wealth management strategy for Jonathan E. Sterling. The primary objective is long-term capital appreciation balanced by active risk management and diversification across non-correlated asset classes.
</p>
<p>
  The strategy aims to generate competitive risk-adjusted returns over a complete market cycle (3 to 5 years). The portfolio targets capital growth while implementing systematic stop-loss and hedging procedures intended to mitigate downside volatility during market contractions. All return targets are forward-looking expectations and do not represent guarantees.
</p>

<h2>2. Recommended Asset Allocation ($10,000,000 Mandate)</h2>
<table class="allocation-table">
  <thead>
    <tr>
      <th>Asset Class / Strategy</th>
      <th>Target Allocation</th>
      <th>Capital Amount</th>
      <th>Benchmark Standard</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>US Large Cap Growth Equity</td>
      <td>40.0%</td>
      <td>$4,000,000</td>
      <td>S&amp;P 500 Index</td>
    </tr>
    <tr>
      <td>Hedging &amp; Tactical Options Overlay</td>
      <td>25.0%</td>
      <td>$2,500,000</td>
      <td>CBOE S&amp;P 500 BuyWrite (BXM)</td>
    </tr>
    <tr>
      <td>Private Credit &amp; Mezzanine Debt</td>
      <td>20.0%</td>
      <td>$2,000,000</td>
      <td>SOFR + 650 bps</td>
    </tr>
    <tr>
      <td>Opportunistic Global Macro</td>
      <td>10.0%</td>
      <td>$1,000,000</td>
      <td>HFRI Macro Index</td>
    </tr>
    <tr>
      <td>Treasuries &amp; Cash Equivalents</td>
      <td>5.0%</td>
      <td>$500,000</td>
      <td>US 3-Month T-Bill</td>
    </tr>
    <tr style="font-weight: bold; background: #e2e8f0;">
      <td>Total Portfolio Commitment</td>
      <td>100.0%</td>
      <td>$10,000,000</td>
      <td>Blended Benchmark Mandate</td>
    </tr>
  </tbody>
</table>

<h2>3. Statutory Compliance Disclosures &amp; Fiduciary Notice</h2>
<div class="disclosure-box">
  <strong>IMPORTANT REGULATORY &amp; RISK DISCLOSURES (FINRA RULE 2210 &amp; SEC COMPLIANCE):</strong><br>
  1. <strong>Risk of Capital Loss:</strong> Securities investments are subject to market risks, including the possible loss of principal. Investors must be willing to accept portfolio value fluctuations.<br>
  2. <strong>No Performance Guarantee:</strong> Past performance is no guarantee of future results. Historical returns and backtested models are hypothetical, illustrative only, and do not reflect actual trading.<br>
  3. <strong>Diversification Limitations:</strong> Asset allocation and diversification strategies do not ensure a profit or protect against loss in declining market conditions.<br>
  4. <strong>Fiduciary Standards:</strong> Springer Capital operates as a Registered Investment Adviser (RIA). Advisory services are conducted in accordance with the Investment Advisers Act of 1940.
</div>

<table class="signatures">
  <tr>
    <td style="width: 45%;">
      <div class="sig-line">
        <strong>Marcus Vance, CFP</strong><br>
        Managing Director &bull; Private Client Advisory<br>
        CRD #449120 &bull; Springer Capital
      </div>
    </td>
    <td style="width: 10%;"></td>
    <td style="width: 45%;">
      <div class="sig-line">
        <strong>Jonathan E. Sterling</strong><br>
        Client Principal &bull; Account ACCT-789201948<br>
        Acknowledged: September 13, 2026
      </div>
    </td>
  </tr>
</table>

</body>
</html>
"""

def generate_pdf(html_content, out_pdf_path):
    with tempfile.NamedTemporaryFile(suffix=".html", mode="w", delete=False) as tmp_html:
        tmp_html.write(html_content)
        tmp_html_path = tmp_html.name
    
    out_dir = os.path.dirname(os.path.abspath(out_pdf_path))
    os.makedirs(out_dir, exist_ok=True)
    
    # Run LibreOffice headless conversion
    cmd = [
        "libreoffice",
        "--headless",
        "--convert-to",
        "pdf:writer_pdf_Export",
        tmp_html_path,
        "--outdir",
        out_dir
    ]
    subprocess.run(cmd, check=True)
    
    # Rename converted file to target name
    converted_name = os.path.splitext(os.path.basename(tmp_html_path))[0] + ".pdf"
    converted_path = os.path.join(out_dir, converted_name)
    if os.path.exists(converted_path):
        os.replace(converted_path, out_pdf_path)
    os.remove(tmp_html_path)
    print(f"Generated: {out_pdf_path} ({os.path.getsize(out_pdf_path)} bytes)")

if __name__ == "__main__":
    out_v1 = os.path.abspath("test_documents/Springer_Capital_Growth_Proposal_v1_Violations.pdf")
    out_v2 = os.path.abspath("test_documents/Springer_Capital_Growth_Proposal_v2_Compliant.pdf")
    
    generate_pdf(V1_HTML, out_v1)
    generate_pdf(V2_HTML, out_v2)
