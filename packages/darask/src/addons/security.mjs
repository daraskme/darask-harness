/** Pattern data forked from Anthropic claude-plugins-official via Hermes security-guidance (Apache-2.0). */
const JS = /\.(js|jsx|ts|tsx|mjs|cjs|mts|cts|vue|svelte)$/i;
const PY = /\.(py|pyi|ipynb)$/i;
const DOCS = /\.(md|mdx|txt|rst|json|yaml|yml)$/i;

const PICKLE = '⚠️ Security Warning: Loading pickle data (or cPickle, cloudpickle, dill, marshal, shelve, joblib, pandas.read_pickle, numpy allow_pickle=True) from untrusted sources allows arbitrary code execution. Prefer JSON or a schema-validated deserializer.';
const YAML = '⚠️ Security Warning: yaml.load() / yaml.unsafe_load() execute arbitrary Python via !!python/object tags. Use yaml.safe_load() and validate.';
const TORCH = '⚠️ Security Warning: torch.load() defaults to weights_only=False, which unpickles arbitrary objects. Pass weights_only=True when the file only contains tensors.';

export const SECURITY_PATTERNS = [
  { ruleName: 'github_actions_workflow', pathCheck: path => path.includes('.github/workflows/') && (path.endsWith('.yml') || path.endsWith('.yaml')), reminder: '⚠️ Security Warning: GitHub Actions workflow. Never interpolate untrusted issue/PR/commit text into run: commands. Put values in env: and quote the shell expansion.' },
  { ruleName: 'child_process_exec', pathFilter: path => JS.test(path), substrings: ['child_process.exec', 'execSync('], regex: /(?<![a-zA-Z0-9_\.])exec\(/, reminder: '⚠️ Security Warning: child_process.exec() runs a shell. Prefer execFile/spawn with an argument array.' },
  { ruleName: 'new_function_injection', substrings: ['new Function'], reminder: '⚠️ Security Warning: new Function() with string interpolation is code injection. Do not interpolate untrusted strings into the function body.' },
  { ruleName: 'eval_injection', pathFilter: path => !DOCS.test(path), regex: /(?<![a-zA-Z0-9_\.])eval\(/, reminder: '⚠️ Security Warning: eval() executes arbitrary code. Use JSON.parse() or ast.literal_eval() instead.' },
  { ruleName: 'react_dangerously_set_html', substrings: ['dangerouslySetInnerHTML'], reminder: '⚠️ Security Warning: dangerouslySetInnerHTML is an XSS sink. Sanitize with DOMPurify or avoid HTML.' },
  { ruleName: 'document_write_xss', substrings: ['document.write'], reminder: '⚠️ Security Warning: document.write() can be used for XSS. Use DOM APIs instead.' },
  { ruleName: 'innerHTML_xss', substrings: ['.innerHTML =', '.innerHTML='], reminder: '⚠️ Security Warning: assigning innerHTML is an XSS sink. Prefer textContent or a sanitizer.' },
  { ruleName: 'pickle_deserialization', pathFilter: path => PY.test(path), regex: /(?<![a-zA-Z0-9_])pickle\.(loads?|Unpickler)\b|(?<![a-zA-Z0-9_])pkl_load\(/, reminder: PICKLE },
  { ruleName: 'os_system_injection', pathFilter: path => PY.test(path), regex: /\bos\.system\s*\(/, substrings: ['from os import system'], reminder: '⚠️ Security Warning: os.system() is a command-injection sink. Use subprocess.run([...]) without a shell.' },
  { ruleName: 'python_subprocess_shell', regex: /subprocess\.(?:run|call|Popen|check_output|check_call)\(.*shell\s*=\s*True/, reminder: '⚠️ Security Warning: subprocess(..., shell=True) enables command injection. Pass an argument list instead.' },
  { ruleName: 'go_exec_shell_injection', regex: /exec\.Command\(\s*"(?:sh|bash|\/bin\/sh|\/bin\/bash)"/, reminder: '⚠️ Security Warning: exec.Command with sh/bash -c enables command injection. Pass arguments directly.' },
  { ruleName: 'unsafe_yaml_load', regex: /\byaml\.load\s*\((?![^)\n]{0,80}\bSafe)/, reminder: YAML },
  { ruleName: 'node_createcipher_no_iv', regex: /\bcrypto\.(createCipher|createDecipher)\b/, reminder: '⚠️ Security Warning: Use createCipheriv / createDecipheriv. createCipher was removed in Node 22.' },
  { ruleName: 'aes_ecb_mode', regex: /\bAES\.MODE_ECB\b|\bmodes\.ECB\s*\(|['"]aes-\d+-ecb['"]/, reminder: '⚠️ Security Warning: AES-ECB leaks plaintext structure. Use AES-GCM or AES-CBC with HMAC.' },
  { ruleName: 'tls_verification_disabled', regex: /\bverify\s*=\s*False\b|rejectUnauthorized\s*:\s*false|InsecureSkipVerify\s*:\s*true|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0|ssl\._create_unverified_context|check_hostname\s*=\s*False/, reminder: '⚠️ Security Warning: disabling TLS verification allows MITM. Trust a CA instead.' },
  { ruleName: 'marshal_loads', regex: /\bmarshal\.loads?\s*\(/, reminder: PICKLE },
  { ruleName: 'shelve_open', regex: /\bshelve\.open\s*\(/, reminder: PICKLE },
  { ruleName: 'xml_unsafe_parse', regex: /\b(xml\.etree\.ElementTree|ElementTree|ET)\.(parse|fromstring|XML)\s*\(|\bminidom\.(parse|parseString)\s*\(|\bxml\.sax\.(parse|make_parser)\b/, reminder: '⚠️ Security Warning: stdlib XML parsers are XXE-vulnerable. Use defusedxml.' },
  { ruleName: 'pickle_variants_load', regex: /\b(cPickle|cloudpickle|dill)\.(load|loads)\s*\(/, reminder: PICKLE },
  { ruleName: 'outerHTML_xss', substrings: ['.outerHTML =', '.outerHTML='], reminder: '⚠️ Security Warning: outerHTML assignment is an XSS sink. Prefer textContent or DOMPurify.' },
  { ruleName: 'insertAdjacentHTML_xss', substrings: ['.insertAdjacentHTML('], reminder: '⚠️ Security Warning: insertAdjacentHTML is an XSS sink. Use insertAdjacentText or sanitize.' },
  { ruleName: 'script_src_without_sri', regex: /<script\s+(?![^>]{0,400}integrity\s*=)[^>]{0,200}src\s*=\s*['"](?:https?:)?\/\/[^'"]{1,300}['"][^>]{0,100}>/, reminder: '⚠️ Security Warning: external <script src> without integrity= is exposed to CDN compromise. Add SRI.' },
  { ruleName: 'torch_unsafe_load', regex: /(?:\btorch\.load|\.torch_load)\s*\((?![^)\n]{0,200}weights_only\s*=\s*True)/, reminder: TORCH },
  { ruleName: 'yaml_unsafe_load_variants', regex: /(?:\byaml\.unsafe_load|\.yaml_unsafe_load)\s*\(/, reminder: YAML },
  { ruleName: 'pickle_wrapper_load', regex: /\bjoblib\.load\s*\(|\b(?:pd|pandas)\.read_pickle\s*\(|\.cloudpickle_load\s*\(|\b(?:np|numpy)\.load\s*\([^)\n]{0,200}allow_pickle\s*=\s*True/, reminder: PICKLE },
];

const WRITE_TOOLS = new Set(['write', 'edit', 'Write', 'Edit', 'str_replace_editor']);
const MAX_SCAN = 256 * 1024;

export function scanSecurity(path, content) {
  if (!content || Buffer.byteLength(content, 'utf8') > MAX_SCAN) return [];
  const file = path || '';
  const hits = [];
  for (const rule of SECURITY_PATTERNS) {
    try {
      if (rule.pathCheck) {
        if (rule.pathCheck(file)) hits.push(rule);
        continue;
      }
      if (rule.pathFilter && !rule.pathFilter(file)) continue;
    } catch { continue; }
    const sub = (rule.substrings ?? []).some(item => content.includes(item));
    if (sub || (rule.regex && rule.regex.test(content))) hits.push(rule);
  }
  return hits;
}

export function scanToolArgs(name, args) {
  if (!WRITE_TOOLS.has(name)) return [];
  if (!args || typeof args !== 'object') return [];
  const path = stringArg(args, ['path', 'file_path', 'filePath']);
  const chunks = [];
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string' && value && key !== 'path') chunks.push(value);
  }
  return scanSecurity(path, chunks.join('\n'));
}

export function formatSecurityWarning(findings) {
  const names = findings.map(item => item.ruleName).join(', ');
  return ['---', `⚠️ Security guidance — ${findings.length} pattern${findings.length === 1 ? '' : 's'} matched (${names})`, '', ...findings.flatMap(item => [item.reminder, '']), 'Pattern matches can be false positives. If the construct is safe, document why in a comment and continue.'].join('\n');
}

function stringArg(args, keys) {
  for (const key of keys) if (typeof args[key] === 'string') return args[key];
  return '';
}
