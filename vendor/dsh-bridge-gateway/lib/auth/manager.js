// lib/auth/manager.js
// 远程访问安全认证管理器：密码加盐哈希、Session 管理、免密安全 Token、防暴力破解与全协议鉴权拦截

import { randomBytes, pbkdf2Sync, timingSafeEqual, createPublicKey, verify as cryptoVerify } from 'node:crypto'

const DEFAULT_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 天
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_PERIOD_MS = 60 * 1000 // 连续失败封禁 60 秒
const CF_KEYS_TTL_MS = 60 * 60 * 1000 // Cloudflare Access 公開鍵の再取得間隔

// Cloudflare Access のチームドメインを <name>.cloudflareaccess.com 形式に正規化
function normalizeCfTeamDomain(value) {
  if (typeof value !== 'string') return ''
  let host = value.trim().toLowerCase()
  if (!host) return ''
  host = host.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (/^[a-z0-9][a-z0-9-]{0,62}$/.test(host)) host = `${host}.cloudflareaccess.com`
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.cloudflareaccess\.com$/.test(host)) return ''
  return host
}

function decodeJwtPart(part) {
  try { return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) } catch { return null }
}

export class AuthManager {
  /**
   * @param {object} opts
   * @param {object} [opts.config]
   * @param {boolean} [opts.config.enabled=false]
   * @param {'token_and_password'|'password_only'|'token_only'} [opts.config.mode='token_and_password']
   * @param {string} [opts.config.passwordHash]
   * @param {string} [opts.config.passwordSalt]
   * @param {string} [opts.config.secretToken]
   * @param {boolean} [opts.config.allowLoopback=true]
   * @param {(patch: object) => Promise<void>|void} [opts.onPersist]
   * @param {object} [opts.logger]
   */
  constructor({ config = {}, onPersist, logger = console, fetch: fetchImpl } = {}) {
    this.logger = logger
    this.onPersist = onPersist
    this.fetch = typeof fetchImpl === 'function' ? fetchImpl : (...args) => globalThis.fetch(...args)

    this.enabled = Boolean(config.enabled)
    this.mode = config.mode || 'token_and_password'
    this.scope = config.scope || 'all' // 'all' | 'public_only' | 'lan_only'
    this.adminPolicy = config.adminPolicy || 'password_unlock' // 'password_unlock' | 'local_only' | 'open'
    this.passwordHash = config.passwordHash || ''
    this.passwordSalt = config.passwordSalt || ''
    this.adminPasswordHash = config.adminPasswordHash || ''
    this.adminPasswordSalt = config.adminPasswordSalt || ''
    this.secretToken = config.secretToken || this._generateToken()
    this.allowLoopback = config.allowLoopback !== false
    // Cloudflare Zero Trust (Access): teamDomain には <name>.cloudflareaccess.com、aud にはアプリケーションの AUD タグ
    this.cfAccess = {
      enabled: Boolean(config.cfAccess?.enabled),
      teamDomain: normalizeCfTeamDomain(config.cfAccess?.teamDomain),
      aud: typeof config.cfAccess?.aud === 'string' ? config.cfAccess.aud.trim().slice(0, 256) : '',
    }
    // Cloudflare Access 公開鍵（JWKS）のメモリキャッシュ: kid -> KeyObject
    this.cfKeys = new Map()
    this.cfKeysAt = 0
    this.cfKeysRefresh = null
    this.cfKeysRetryAt = 0
    this.cfUnknownRetryAt = 0
    // 内部隧道专用鉴权密钥（内存生成，用于辨别本地自建隧道转发流量与真实本机访问）
    this.internalTunnelSecret = randomBytes(24).toString('hex')

    // Session 内存存储：sessionToken -> { createdAt, expiresAt }
    this.sessions = new Map()
    // 管理员解锁 Session 内存存储：adminToken -> { createdAt, expiresAt }
    this.adminSessions = new Map()
    // 防暴力破解：ip -> { failedCount, lockUntil }
    this.rateLimits = new Map()

    // 定期清理过期 Session (每小时)
    this._cleanupTimer = setInterval(() => this._cleanupExpired(), 60 * 60 * 1000)
    if (this._cleanupTimer.unref) this._cleanupTimer.unref()
  }

  _generateToken() {
    return 'dsh_' + randomBytes(18).toString('hex')
  }

  _hashPassword(password, salt) {
    return pbkdf2Sync(String(password), salt, 10000, 32, 'sha256').toString('hex')
  }

  get hasPassword() {
    return Boolean(this.passwordHash && this.passwordSalt)
  }

  get hasAdminPassword() {
    return Boolean(this.adminPasswordHash && this.adminPasswordSalt)
  }

  /**
   * 获取安全认证状态（默认脱敏保护，防止普通接口泄露完整 Secret Token）
   */
  getStatus({ masked = true } = {}) {
    let token = this.secretToken;
    if (masked && token) {
      token = `${token.slice(0, 8)}****************`;
    }
    return {
      enabled: this.enabled,
      mode: this.mode,
      scope: this.scope,
      adminPolicy: this.adminPolicy,
      hasPassword: this.hasPassword,
      hasAdminPassword: this.hasAdminPassword,
      secretToken: token,
      allowLoopback: this.allowLoopback,
      cfAccess: this._cfAccessStatus(),
    }
  }

  /**
   * 仅限经过鉴权的管理员会话或公开策略下获取原始未脱敏 Secret Token
   */
  getRawSecretToken(adminToken) {
    if (this.adminPolicy !== 'open') {
      const hasAnyPassword = this.hasAdminPassword || this.hasPassword
      if (hasAnyPassword && (!adminToken || !this.validateAdminSession(adminToken))) {
        return null
      }
    }
    return this.secretToken
  }

  /**
   * 公开状态查询（供未认证访客/登录页使用，严格不包含 secretToken）
   */
  getPublicStatus() {
    return {
      enabled: this.enabled,
      mode: this.mode,
      scope: this.scope,
      adminPolicy: this.adminPolicy,
      hasPassword: this.hasPassword,
      hasAdminPassword: this.hasAdminPassword,
      allowLoopback: this.allowLoopback,
      cfAccess: this._cfAccessStatus(),
    }
  }

  _cfAccessStatus() {
    return {
      enabled: Boolean(this.cfAccess?.enabled),
      teamDomain: this.cfAccess?.teamDomain || '',
      aud: this.cfAccess?.aud || '',
      configured: this.cfAccessConfigured,
    }
  }

  get cfAccessConfigured() {
    return Boolean(this.cfAccess?.enabled && this.cfAccess.teamDomain && this.cfAccess.aud)
  }

  get cfIssuer() {
    return `https://${this.cfAccess.teamDomain}`
  }

  async setCfAccess(input = {}, { persist = true } = {}) {
    const teamDomain = normalizeCfTeamDomain(input.teamDomain ?? this.cfAccess.teamDomain)
    const aud = typeof input.aud === 'string' ? input.aud.trim().slice(0, 256) : this.cfAccess.aud
    const enabled = input.enabled === undefined ? this.cfAccess.enabled : Boolean(input.enabled)
    if (enabled && (!teamDomain || !aud)) {
      throw new Error('Cloudflare Access にはチームドメインとアプリケーションの AUD が必要です')
    }
    if (teamDomain !== this.cfAccess.teamDomain) {
      this.cfKeys.clear()
      this.cfKeysAt = 0
      this.cfKeysRetryAt = 0
      this.cfUnknownRetryAt = 0
    }
    this.cfAccess = { enabled, teamDomain, aud }
    if (persist) await this._persist()
  }

  async setEnabled(enabled) {
    this.enabled = Boolean(enabled)
    this.sessions.clear()
    this.adminSessions.clear()
    await this._persist()
  }

  async setMode(mode) {
    if (['token_and_password', 'password_only', 'token_only'].includes(mode)) {
      this.mode = mode
      // 切换认证模式时清空所有现有 Session，确保新策略立即对所有设备生效
      this.sessions.clear()
      this.adminSessions.clear()
      await this._persist()
    }
  }

  async setScope(scope) {
    if (['all', 'public_only', 'lan_only'].includes(scope)) {
      this.scope = scope
      this.sessions.clear()
      this.adminSessions.clear()
      await this._persist()
    }
  }

  async setAdminPolicy(policy) {
    if (['password_unlock', 'local_only', 'open'].includes(policy)) {
      this.adminPolicy = policy
      this.adminSessions.clear()
      await this._persist()
    }
  }

  // 设置外部访客访问密码
  async setPassword(password) {
    if (!password) {
      this.passwordHash = ''
      this.passwordSalt = ''
    } else {
      const salt = randomBytes(16).toString('hex')
      const hash = this._hashPassword(password, salt)
      this.passwordHash = hash
      this.passwordSalt = salt
    }
    // 更改访问密码时使所有普通访客 Session 失效
    this.sessions.clear()
    await this._persist()
  }

  // 设置后台管理员密码
  async setAdminPassword(password) {
    if (!password) {
      this.adminPasswordHash = ''
      this.adminPasswordSalt = ''
    } else {
      const salt = randomBytes(16).toString('hex')
      const hash = this._hashPassword(password, salt)
      this.adminPasswordHash = hash
      this.adminPasswordSalt = salt
    }
    // 更改管理密码时使所有远程管理员解锁 Session 失效
    this.adminSessions.clear()
    await this._persist()
  }

  async regenerateSecretToken() {
    this.secretToken = this._generateToken()
    this.sessions.clear()
    await this._persist()
    return this.secretToken
  }

  // 管理员解锁控制
  createAdminSession(maxAgeMs = 30 * 60 * 1000) {
    const adminToken = randomBytes(24).toString('hex')
    const now = Date.now()
    this.adminSessions.set(adminToken, {
      createdAt: now,
      expiresAt: now + maxAgeMs,
    })
    return adminToken
  }

  validateAdminSession(adminToken) {
    if (!adminToken) return false
    const sess = this.adminSessions.get(adminToken)
    if (!sess) return false
    if (Date.now() > sess.expiresAt) {
      this.adminSessions.delete(adminToken)
      return false
    }
    return true
  }

  revokeAdminSession(adminToken) {
    if (adminToken) this.adminSessions.delete(adminToken)
  }

  verifyAdminPassword(inputPassword, clientIp = '') {
    if (this.isIpBlocked(clientIp)) {
      return { success: false, error: '尝试次数过多，请稍后再试' }
    }

    const targetHash = this.adminPasswordHash || this.passwordHash
    const targetSalt = this.adminPasswordSalt || this.passwordSalt

    if (!targetHash || !targetSalt) {
      return { success: true }
    }

    const inputHash = this._hashPassword(inputPassword, targetSalt)
    const bufA = Buffer.from(inputHash, 'hex')
    const bufB = Buffer.from(targetHash, 'hex')

    if (bufA.length === bufB.length && timingSafeEqual(bufA, bufB)) {
      this.recordSuccess(clientIp)
      return { success: true }
    }

    this.recordFailedAttempt(clientIp)
    return { success: false, error: '管理员密码错误' }
  }

  unlockAdmin(password, clientIp = '') {
    if (this.adminPolicy === 'local_only') {
      return { ok: false, error: '当前已配置为仅限电脑本机管理设置' }
    }
    const hasAnyPassword = this.hasAdminPassword || this.hasPassword
    if (!hasAnyPassword) {
      const adminToken = this.createAdminSession()
      return { ok: true, adminToken }
    }
    const verify = this.verifyAdminPassword(password, clientIp)
    if (verify.success) {
      const adminToken = this.createAdminSession()
      return { ok: true, adminToken }
    }
    return { ok: false, error: verify.error || '管理员密码错误' }
  }

  async _persist() {
    if (typeof this.onPersist === 'function') {
      try {
        await this.onPersist({
          enabled: this.enabled,
          mode: this.mode,
          scope: this.scope,
          adminPolicy: this.adminPolicy,
          passwordHash: this.passwordHash,
          passwordSalt: this.passwordSalt,
          adminPasswordHash: this.adminPasswordHash,
          adminPasswordSalt: this.adminPasswordSalt,
          secretToken: this.secretToken,
          allowLoopback: this.allowLoopback,
          cfAccess: { ...this.cfAccess },
        })
      } catch (err) {
        this.logger.error?.('[dsh-bridge auth] persist failed:', err?.message ?? err)
      }
    }
  }

  // ---- 认证校验逻辑 ----

  /**
   * 校验客户端密码
   */
  verifyPassword(inputPassword, clientIp = '') {
    if (this.isIpBlocked(clientIp)) {
      return { success: false, error: '尝试次数过多，请稍后再试' }
    }

    // 严禁 token_only 模式下通过密码登录接口获取 Session
    if (this.mode === 'token_only') {
      return { success: false, error: '当前仅允许专属安全 Token 扫码访问，不支持密码登录' }
    }

    if (!this.hasPassword) {
      // 若处于仅密码模式但尚未设置密码，不允许直接空白登录
      if (this.mode === 'password_only') {
        return { success: false, error: '管理员尚未设置访问密码，请先在控制台中设置密码' }
      }
      return { success: true }
    }

    const inputHash = this._hashPassword(inputPassword, this.passwordSalt)
    const bufA = Buffer.from(inputHash, 'hex')
    const bufB = Buffer.from(this.passwordHash, 'hex')

    if (bufA.length === bufB.length && timingSafeEqual(bufA, bufB)) {
      this.recordSuccess(clientIp)
      return { success: true }
    }

    this.recordFailedAttempt(clientIp)
    return { success: false, error: 'アクセスパスワードが違います' }
  }

  /**
   * 校验安全 Token
   */
  validateSecretToken(token) {
    if (!token || !this.secretToken) return false
    const bufA = Buffer.from(String(token))
    const bufB = Buffer.from(String(this.secretToken))
    if (bufA.length !== bufB.length) return false
    return timingSafeEqual(bufA, bufB)
  }

  /**
   * 创建 Session
   */
  createSession(maxAgeMs = DEFAULT_SESSION_MAX_AGE_MS) {
    const sessionToken = randomBytes(24).toString('hex')
    const now = Date.now()
    this.sessions.set(sessionToken, {
      createdAt: now,
      expiresAt: now + maxAgeMs,
    })
    return sessionToken
  }

  /**
   * 校验 Session
   */
  validateSession(sessionToken) {
    if (!sessionToken) return false
    const sess = this.sessions.get(sessionToken)
    if (!sess) return false
    if (Date.now() > sess.expiresAt) {
      this.sessions.delete(sessionToken)
      return false
    }
    return true
  }

  /**
   * 销毁 Session
   */
  revokeSession(sessionToken) {
    if (sessionToken) this.sessions.delete(sessionToken)
  }

  // ---- 防暴力破解 ----

  isIpBlocked(ip) {
    if (!ip) return false
    const record = this.rateLimits.get(ip)
    if (!record) return false
    if (record.lockUntil && Date.now() < record.lockUntil) {
      return true
    }
    if (record.lockUntil && Date.now() >= record.lockUntil) {
      this.rateLimits.delete(ip)
      return false
    }
    return false
  }

  recordFailedAttempt(ip) {
    if (!ip) return
    const now = Date.now()
    const record = this.rateLimits.get(ip) || { failedCount: 0, lockUntil: 0 }
    record.failedCount += 1
    if (record.failedCount >= MAX_FAILED_ATTEMPTS) {
      record.lockUntil = now + LOCKOUT_PERIOD_MS
      this.logger.warn?.(`[dsh-bridge auth] IP ${ip} locked out for 60s due to repeated failed attempts`)
    }
    this.rateLimits.set(ip, record)
  }

  recordSuccess(ip) {
    if (ip) this.rateLimits.delete(ip)
  }

  // ---- Cloudflare Access (Zero Trust) ----

  /**
   * 証明書 (JWKS) を取得し、kid ごとの公開鍵をキャッシュする。
   * 設定が未完了・取得失敗なら認証を拒否する。
   */
  async ensureCfKeys(force = false) {
    if (!this.cfAccessConfigured) return false
    const stale = Date.now() - this.cfKeysAt > CF_KEYS_TTL_MS
    if (!force && this.cfKeys.size && !stale) return true
    if (this.cfKeysRefresh) return this.cfKeysRefresh
    if (Date.now() < this.cfKeysRetryAt) return false
    const issuer = this.cfIssuer
    this.cfKeysRefresh = (async () => {
      try {
        const response = await this.fetch(`${issuer}/cdn-cgi/access/certs`, {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
          redirect: 'error',
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body = await response.json()
        const list = Array.isArray(body?.keys) ? body.keys : []
        const keys = new Map()
        for (const jwk of list) {
          if (!jwk || typeof jwk.kid !== 'string' || jwk.kty !== 'RSA'
            || (jwk.use && jwk.use !== 'sig') || (jwk.alg && jwk.alg !== 'RS256')) continue
          try { keys.set(jwk.kid, createPublicKey({ key: jwk, format: 'jwk' })) } catch {}
        }
        if (!keys.size) throw new Error('no usable keys')
        if (issuer !== this.cfIssuer) return false
        this.cfKeys = keys
        this.cfKeysAt = Date.now()
        return true
      } catch (error) {
        this.logger.warn?.(`[dsh-bridge auth] Cloudflare Access key fetch failed: ${error?.message ?? error}`)
        this.cfKeysRetryAt = Date.now() + 30000
        return false
      } finally {
        this.cfKeysRefresh = null
      }
    })()
    return this.cfKeysRefresh
  }

  _cfAssertion(req) {
    const header = req.headers?.['cf-access-jwt-assertion']
    if (typeof header === 'string' && header) return header
    const cookie = req.headers?.cookie || ''
    const match = /(?:^|;\s*)CF_Authorization=([^;\s]+)/.exec(cookie)
    return match ? match[1] : ''
  }

  /**
   * CF_Authorization JWT を検証する。鍵は ensureCfKeys で先に取得しておく。
   * @returns {{ok: boolean, email?: string, unknownKid?: boolean}}
   */
  _verifyCfJwt(token) {
    if (typeof token !== 'string' || token.length > 16384) return { ok: false }
    const parts = token.split('.')
    if (parts.length !== 3) return { ok: false }
    const header = decodeJwtPart(parts[0])
    const payload = decodeJwtPart(parts[1])
    if (!header || !payload || header.alg !== 'RS256' || typeof header.kid !== 'string') return { ok: false }
    const key = this.cfKeys.get(header.kid)
    if (!key) return { ok: false, unknownKid: true }
    let signature
    try { signature = Buffer.from(parts[2], 'base64url') } catch { return { ok: false } }
    if (!signature.length) return { ok: false }
    try {
      if (!cryptoVerify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, signature)) return { ok: false }
    } catch { return { ok: false } }
    const now = Math.floor(Date.now() / 1000)
    if (payload.iss !== this.cfIssuer) return { ok: false }
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
    if (!aud.includes(this.cfAccess.aud)) return { ok: false }
    if (!Number.isFinite(payload.exp) || payload.exp <= now) return { ok: false }
    if (payload.nbf !== undefined && (!Number.isFinite(payload.nbf) || payload.nbf > now + 60)) return { ok: false }
    return { ok: true, email: typeof payload.email === 'string' ? payload.email.slice(0, 254) : '' }
  }

  /**
   * Cloudflare トンネル経由かつ Access 設定済みの要求を JWT で判定する。
   * 未知の kid は鍵を再取得して一度だけ再判定する。
   */
  async verifyRequestAsync(req) {
    if (!this.enabled) return this.verifyRequest(req)
    const isCloudflare = Boolean((req.socket?.remoteAddress === '127.0.0.1' || req.socket?.remoteAddress === '::1' || req.socket?.remoteAddress === '::ffff:127.0.0.1')
      && (req.headers?.['cf-ray'] || req.headers?.['cf-connecting-ip']))
    if (this.cfAccess.enabled && isCloudflare) {
      if (!this._cfAssertion(req)) return { authenticated: false, cfAccessRequired: true }
      if (!await this.ensureCfKeys()) return { authenticated: false, cfAccessRequired: true }
      let result = this.verifyRequest(req)
      if (result.cfUnknownKid && Date.now() >= this.cfUnknownRetryAt) {
        this.cfUnknownRetryAt = Date.now() + 60000
        await this.ensureCfKeys(true)
        result = this.verifyRequest(req)
      }
      return result
    }
    return this.verifyRequest(req)
  }

  // ---- HTTP / WebSocket 请求总入口鉴权 ----

  /**
   * 检查请求是否已授权
   * @param {import('node:http').IncomingMessage} req
   * @returns {{ authenticated: boolean, fromToken?: boolean, sessionToken?: string, loopback?: boolean, bypass?: boolean, lanBypass?: boolean, publicBypass?: boolean, cfAccess?: boolean, cfAccessRequired?: boolean, cfUnknownKid?: boolean }}
   */
  verifyRequest(req) {
    if (!this.enabled) return { authenticated: true, bypass: true }

    const remote = req.socket?.remoteAddress || ''
    const isLoopback = (remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1')

    // 辨别是否来自自建隧道或 Cloudflare 隧道 (只有从 127.0.0.1 传入且带有合法内部凭据/Cloudflare 标头才算)
    const internalTunnelHeader = req.headers?.['x-dsh-internal-tunnel']
    const isCustomTunnel = Boolean(isLoopback && internalTunnelHeader && internalTunnelHeader === this.internalTunnelSecret)
    const isCloudflare = Boolean(isLoopback && (req.headers?.['cf-ray'] || req.headers?.['cf-connecting-ip']))
    const isPublicTunnel = isCustomTunnel || isCloudflare

    // 2. 本地环回免认证（真正的宿主机物理浏览器 127.0.0.1 访问，非 Tunnel 转发）
    if (this.allowLoopback && isLoopback && !isPublicTunnel) {
      const host = String(req.headers?.host || '')
      if (host.startsWith('127.0.0.1') || host.startsWith('localhost') || host === '') {
        return { authenticated: true, loopback: true }
      }
    }

    // 2.5 Cloudflare Zero Trust: Cloudflare トンネル経由の要求は Access の JWT で認証する
    if (this.cfAccess.enabled && isCloudflare) {
      const result = this._verifyCfJwt(this._cfAssertion(req))
      if (result.ok) return { authenticated: true, cfAccess: true, email: result.email }
      return { authenticated: false, cfAccessRequired: true, cfUnknownKid: result.unknownKid === true }
    }

    // 3. 检查防护范围 (scope: 'all' | 'public_only' | 'lan_only')
    if (this.scope === 'public_only' && !isPublicTunnel) {
      return { authenticated: true, lanBypass: true }
    }

    if (this.scope === 'lan_only' && isPublicTunnel) {
      return { authenticated: true, publicBypass: true }
    }

    // 4. 从 Query 参数中解析 ?auth=token 或 ?token=token (用于扫码免密登录)
    if (this.mode !== 'password_only') {
      try {
        const urlObj = new URL(req.url, 'http://localhost')
        const queryToken = urlObj.searchParams.get('auth') || urlObj.searchParams.get('token')
        if (queryToken && this.validateSecretToken(queryToken)) {
          return { authenticated: true, fromToken: true, secretToken: queryToken }
        }
      } catch {}
    }

    // 5. 从 Cookie 中解析 Session Token: dsh_bridge_auth=<token>
    const cookieHeader = req.headers?.cookie || ''
    const match = /(?:^|;\s*)dsh_bridge_auth=([a-f0-9]+)/i.exec(cookieHeader)
    if (match) {
      const sessionToken = match[1]
      if (this.validateSession(sessionToken)) {
        return { authenticated: true, sessionToken }
      }
    }

    // 未授权
    return { authenticated: false }
  }

  _cleanupExpired() {
    const now = Date.now()
    for (const [t, s] of this.sessions.entries()) {
      if (now > s.expiresAt) this.sessions.delete(t)
    }
    for (const [ip, r] of this.rateLimits.entries()) {
      if (r.lockUntil && now > r.lockUntil) this.rateLimits.delete(ip)
    }
  }

  dispose() {
    clearInterval(this._cleanupTimer)
    this.sessions.clear()
    this.rateLimits.clear()
    this.cfKeys.clear()
  }
}
