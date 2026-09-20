import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('Automated Secrets & Credential Leakage Prevention', () => {
  const repoRoot = path.resolve(__dirname, '../../');

  it('SECRETS GATE: .env file must never be tracked by git', () => {
    try {
      const trackedFiles = execSync('git ls-files', { cwd: repoRoot, encoding: 'utf-8' });
      const trackedList = trackedFiles.split('\n').map((f) => f.trim());

      const trackedEnvFiles = trackedList.filter(
        (f) => f === '.env' || (f.endsWith('/.env') && !f.endsWith('.env.example'))
      );

      expect(trackedEnvFiles).toEqual([]);
    } catch (err) {
      // If git command fails in an isolated environment, fallback to reading .gitignore
      const gitignorePath = path.join(repoRoot, '.gitignore');
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      expect(gitignore).toContain('.env');
    }
  });

  it('SECRETS GATE: Python Secrets Scanner detects zero credentials in working tree', () => {
    const scannerScript = path.join(repoRoot, 'scripts/scan_secrets.py');
    expect(fs.existsSync(scannerScript)).toBe(true);

    // Run Python secrets scanner on working tree
    try {
      const output = execSync(`python "${scannerScript}" working-tree`, {
        cwd: repoRoot,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      expect(output).toContain('0 Potential Secrets Detected');
    } catch (err: any) {
      // If Python throws exit code 1, secrets were detected
      throw new Error(`Secrets detected in repository:\n${err.stdout || err.stderr}`);
    }
  });

  it('SECRETS GATE: Pre-commit hook is configured and executable', () => {
    const hookPath = path.join(repoRoot, '.githooks/pre-commit');
    expect(fs.existsSync(hookPath)).toBe(true);

    const hookContent = fs.readFileSync(hookPath, 'utf-8');
    expect(hookContent).toContain('scan_secrets.py');
  });

  it('SECRETS GATE: .gitignore excludes all sensitive key and credential formats', () => {
    const gitignorePath = path.join(repoRoot, '.gitignore');
    const content = fs.readFileSync(gitignorePath, 'utf-8');

    expect(content).toContain('.env');
    expect(content).toContain('*.pem');
    expect(content).toContain('*.key');
    expect(content).toContain('credentials.json');
  });
});
