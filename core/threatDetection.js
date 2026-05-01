/**
 * Advanced Threat Detection & Prevention System
 * DDoS protection, brute force detection, anomaly detection, WAF
 */

class ThreatDetectionSystem {
  constructor(config = {}) {
    this.config = {
      enableDDoSProtection: config.enableDDoSProtection !== false,
      enableAnomalyDetection: config.enableAnomalyDetection !== false,
      enableWAF: config.enableWAF !== false,
      enableRateLimiting: config.enableRateLimiting !== false,
      
      // DDoS thresholds
      requestsPerSecond: config.requestsPerSecond || 1000,
      bytesPerSecond: config.bytesPerSecond || 10 * 1024 * 1024, // 10MB
      connectionLimit: config.connectionLimit || 10000,
      
      // Brute force thresholds
      maxLoginAttempts: config.maxLoginAttempts || 5,
      lockoutDuration: config.lockoutDuration || 15 * 60 * 1000,
      
      // Anomaly detection
      anomalyThreshold: config.anomalyThreshold || 0.8,
      baselineWindow: config.baselineWindow || 7 * 24 * 60 * 60 * 1000, // 7 days
      
      // Rate limiting
      defaultRateLimit: config.defaultRateLimit || 100, // requests
      rateLimitWindow: config.rateLimitWindow || 60000, // 1 minute
      
      ...config
    };

    this.requestLog = [];
    this.ipMetrics = new Map();
    this.threatScores = new Map();
    this.suspiciousPatterns = [];
    this.blockedIPs = new Set();
    this.trustedIPs = new Set();
    this.baseline = new Map();
    this.alerts = [];
  }

  /**
   * Analyze request for threats
   */
  analyzeRequest(req) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const timestamp = Date.now();

    const analysis = {
      clientIp,
      timestamp,
      path: req.path,
      method: req.method,
      size: req.get('content-length') || 0,
      userAgent: req.get('user-agent'),
      threats: [],
      threatLevel: 'LOW',
      score: 0
    };

    // Check if IP is blocked
    if (this.blockedIPs.has(clientIp)) {
      analysis.threats.push('IP is blocked');
      analysis.threatLevel = 'BLOCKED';
      return analysis;
    }

    if (this.trustedIPs.has(clientIp)) {
      this.requestLog.push(analysis);
      this.updateIPMetrics(clientIp, analysis);
      return analysis;
    }

    // DDoS detection
    if (this.config.enableDDoSProtection) {
      this.analyzeForDDoS(clientIp, analysis);
    }

    // WAF check
    if (this.config.enableWAF) {
      this.analyzeWithWAF(req, analysis);
    }

    // Anomaly detection
    if (this.config.enableAnomalyDetection) {
      this.detectAnomalies(clientIp, analysis);
    }

    // Calculate threat score
    analysis.score = this.calculateThreatScore(analysis);

    // Update threat scores
    if (analysis.score > 0) {
      const currentScore = this.threatScores.get(clientIp) || 0;
      this.threatScores.set(clientIp, currentScore + analysis.score);
    }

    // Log request
    this.requestLog.push(analysis);
    this.updateIPMetrics(clientIp, analysis);

    // Determine threat level
    if (analysis.threats.length > 0) {
      analysis.threatLevel = analysis.threats.length > 2 ? 'CRITICAL' : 'HIGH';
    }

    // Auto-block if critical
    if (analysis.threatLevel === 'CRITICAL' && this.threatScores.get(clientIp) > 100) {
      this.blockIP(clientIp, 'Critical threat detected');
      analysis.threatLevel = 'BLOCKED';
    }

    return analysis;
  }

  /**
   * Analyze for DDoS attack
   */
  analyzeForDDoS(clientIp, analysis) {
    const metrics = this.getIPMetrics(clientIp);

    // Check request rate
    const now = Date.now();
    const recentRequests = metrics.requests.filter(r => now - r < 1000);

    if (recentRequests.length > this.config.requestsPerSecond / 100) {
      analysis.threats.push('Possible DDoS: High request rate');
      analysis.score += 30;
    }

    // Check bytes per second
    const recentBytes = metrics.bytesRecent || 0;
    if (recentBytes > this.config.bytesPerSecond) {
      analysis.threats.push('Possible DDoS: High bandwidth usage');
      analysis.score += 25;
    }

    // Check for connection limit
    if (metrics.activeConnections > this.config.connectionLimit / 10) {
      analysis.threats.push('Possible DDoS: Too many concurrent connections');
      analysis.score += 20;
    }

    // Check for patterns
    const userAgents = new Set(metrics.userAgents);
    if (userAgents.size === 1 && metrics.requests.length > 50) {
      analysis.threats.push('Possible bot: Same user agent for many requests');
      analysis.score += 15;
    }
  }

  /**
   * Web Application Firewall check
   */
  analyzeWithWAF(req, analysis) {
    const maliciousPatterns = [
      /(<script|javascript:|onerror|onclick)/i,
      /(union|select|insert|delete|update|drop|create)\s+(from|into|table)/i,
      /(\.\.|\.\.\/|\.\.\\)/,
      /(%00|%0a|%0d|%27|%22|%3c|%3e)/i,
      /(exec|eval|system|passthru|shell_exec|phpinfo)/i
    ];

    const urlAndQuery = `${req.originalUrl}${JSON.stringify(req.body)}`;

    for (const pattern of maliciousPatterns) {
      if (pattern.test(urlAndQuery)) {
        analysis.threats.push('WAF: Malicious pattern detected');
        analysis.score += 40;
        break;
      }
    }

    // Check for suspicious headers
    if (req.get('x-forwarded-for') && req.get('x-real-ip')) {
      const forwardedIps = req.get('x-forwarded-for').split(',').map(ip => ip.trim());
      if (forwardedIps.length > 5) {
        analysis.threats.push('Suspicious: Too many proxy hops');
        analysis.score += 20;
      }
    }
  }

  /**
   * Detect anomalies
   */
  detectAnomalies(clientIp, analysis) {
    if (!this.baseline.has(clientIp)) {
      this.baseline.set(clientIp, {
        avgRequestSize: 0,
        avgRequestRate: 0,
        commonPaths: new Map(),
        commonMethods: new Map()
      });
      return; // Need baseline first
    }

    const baseline = this.baseline.get(clientIp);
    const metrics = this.getIPMetrics(clientIp);

    // Check for unusual request size
    const avgSize = metrics.totalBytes / metrics.requests.length || 0;
    const sizeDeviation = Math.abs(avgSize - baseline.avgRequestSize) / (baseline.avgRequestSize || 1);

    if (sizeDeviation > 2) {
      analysis.threats.push('Anomaly: Unusual request size');
      analysis.score += 15;
    }

    // Check for unusual paths
    const pathFrequency = new Map();
    metrics.paths.forEach(path => {
      pathFrequency.set(path, (pathFrequency.get(path) || 0) + 1);
    });

    for (const [path, count] of pathFrequency.entries()) {
      if (!baseline.commonPaths.has(path) && count > 10) {
        analysis.threats.push('Anomaly: Accessing uncommon paths');
        analysis.score += 10;
      }
    }

    // Update baseline
    baseline.avgRequestSize = (baseline.avgRequestSize * 0.8) + (avgSize * 0.2);
    baseline.avgRequestRate = metrics.requests.length;
  }

  /**
   * Calculate threat score
   */
  calculateThreatScore(analysis) {
    let score = 0;

    // Threat count
    score += analysis.score || 0;
    score += analysis.threats.length * 5;

    // Time of request (adjust for normal traffic patterns)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 23) {
      score += 5; // Off-peak traffic
    }

    return score;
  }

  /**
   * Update IP metrics
   */
  updateIPMetrics(clientIp, analysis) {
    if (!this.ipMetrics.has(clientIp)) {
      this.ipMetrics.set(clientIp, {
        requests: [],
        totalRequests: 0,
        totalBytes: 0,
        bytesRecent: 0,
        paths: [],
        userAgents: [],
        activeConnections: 1,
        lastSeen: Date.now()
      });
    }

    const metrics = this.ipMetrics.get(clientIp);
    metrics.requests.push(Date.now());
    metrics.totalRequests++;
    const size = Number(analysis.size) || 0;
    metrics.totalBytes += size;
    metrics.bytesRecent += size;
    metrics.paths.push(analysis.path);
    metrics.userAgents.push(analysis.userAgent);
    metrics.lastSeen = Date.now();

    // Clean old requests (keep only last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    metrics.requests = metrics.requests.filter(r => r > oneHourAgo);

    // Reset bytes every minute
    const timer = setTimeout(() => {
      metrics.bytesRecent = 0;
    }, 60000);
    if (timer.unref) timer.unref();
  }

  /**
   * Get IP metrics
   */
  getIPMetrics(clientIp) {
    return this.ipMetrics.get(clientIp) || {
      requests: [],
      totalRequests: 0,
      totalBytes: 0,
      bytesRecent: 0,
      paths: [],
      userAgents: [],
      activeConnections: 0
    };
  }

  /**
   * Block IP address
   */
  blockIP(ip, reason = 'Security threat') {
    this.blockedIPs.add(ip);
    this.alerts.push({
      type: 'IP_BLOCKED',
      ip,
      reason,
      timestamp: Date.now()
    });

    console.warn(`[ThreatDetection] Blocked IP ${ip}: ${reason}`);

    // Auto-unblock after 1 hour
    const timer = setTimeout(() => {
      this.blockedIPs.delete(ip);
    }, 60 * 60 * 1000);
    if (timer.unref) timer.unref();
  }

  /**
   * Unblock IP address
   */
  unblockIP(ip) {
    this.blockedIPs.delete(ip);
    this.alerts.push({
      type: 'IP_UNBLOCKED',
      ip,
      timestamp: Date.now()
    });
  }

  /**
   * Trust IP address
   */
  trustIP(ip) {
    this.trustedIPs.add(ip);
    this.threatScores.delete(ip);
  }

  /**
   * Get threat report
   */
  getThreatReport() {
    const criticalThreats = Array.from(this.threatScores.entries())
      .filter(([ip, score]) => score > 50 && !this.trustedIPs.has(ip))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, score]) => ({ ip, score, metrics: this.getIPMetrics(ip) }));

    return {
      reportTime: new Date().toISOString(),
      blockedIPs: Array.from(this.blockedIPs),
      trustedIPs: Array.from(this.trustedIPs),
      criticalThreats,
      recentAlerts: this.alerts.slice(-20),
      statistics: {
        totalRequests: this.requestLog.length,
        uniqueIPs: this.ipMetrics.size,
        threatCount: this.threatScores.size,
        blockedCount: this.blockedIPs.size
      }
    };
  }

  /**
   * Get security events
   */
  getSecurityEvents(limit = 100) {
    return this.requestLog
      .filter(r => r.threatLevel !== 'LOW')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clear threat data
   */
  resetThreatData() {
    this.requestLog = [];
    this.ipMetrics.clear();
    this.threatScores.clear();
    this.suspiciousPatterns = [];
    this.blockedIPs.clear();
    this.alerts = [];
  }
}

module.exports = ThreatDetectionSystem;
