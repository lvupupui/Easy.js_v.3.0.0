const ThreatDetectionSystem = require('../../core/threatDetection');

const request = (overrides = {}) => {
  const headers = {
    'content-length': '12',
    'user-agent': 'jest-agent',
    ...overrides.headers
  };

  return {
    ip: '10.0.0.1',
    path: '/login',
    method: 'POST',
    originalUrl: '/login',
    body: {},
    connection: { remoteAddress: '10.0.0.1' },
    get: (name) => headers[name.toLowerCase()],
    ...overrides
  };
};

describe('ThreatDetectionSystem', () => {
  it('detects WAF patterns and preserves weighted threat scores', () => {
    const detector = new ThreatDetectionSystem();

    const analysis = detector.analyzeRequest(request({
      originalUrl: '/search?q=<script>alert(1)</script>'
    }));

    expect(analysis.threats).toContain('WAF: Malicious pattern detected');
    expect(analysis.score).toBeGreaterThanOrEqual(45);
    expect(detector.getSecurityEvents()).toHaveLength(1);
  });

  it('detects DDoS-style request rates from existing IP metrics', () => {
    const detector = new ThreatDetectionSystem({ requestsPerSecond: 100 });
    detector.ipMetrics.set('10.0.0.1', {
      requests: Array.from({ length: 3 }, () => Date.now()),
      totalRequests: 3,
      totalBytes: 0,
      bytesRecent: 0,
      paths: [],
      userAgents: ['same-agent', 'same-agent', 'same-agent'],
      activeConnections: 0,
      lastSeen: Date.now()
    });

    const analysis = detector.analyzeRequest(request());

    expect(analysis.threats).toContain('Possible DDoS: High request rate');
    expect(analysis.threatLevel).toBe('HIGH');
  });

  it('blocks, unblocks, trusts, reports, and resets threat state', () => {
    const detector = new ThreatDetectionSystem();

    detector.blockIP('10.0.0.2', 'test');
    expect(detector.analyzeRequest(request({ ip: '10.0.0.2' })).threatLevel).toBe('BLOCKED');

    detector.unblockIP('10.0.0.2');
    detector.trustIP('10.0.0.1');
    const trustedAnalysis = detector.analyzeRequest(request({
      originalUrl: '/search?q=<script>alert(1)</script>'
    }));

    expect(trustedAnalysis.threatLevel).toBe('LOW');
    expect(detector.getThreatReport()).toEqual(expect.objectContaining({
      trustedIPs: ['10.0.0.1']
    }));

    detector.resetThreatData();
    expect(detector.getThreatReport().statistics).toEqual({
      totalRequests: 0,
      uniqueIPs: 0,
      threatCount: 0,
      blockedCount: 0
    });
  });

  it('detects anomalies after a baseline exists', () => {
    const detector = new ThreatDetectionSystem();
    detector.baseline.set('10.0.0.1', {
      avgRequestSize: 1,
      avgRequestRate: 1,
      commonPaths: new Map([['/known', 10]]),
      commonMethods: new Map([['GET', 10]])
    });
    detector.ipMetrics.set('10.0.0.1', {
      requests: Array.from({ length: 12 }, () => Date.now()),
      totalRequests: 12,
      totalBytes: 12000,
      bytesRecent: 0,
      paths: Array.from({ length: 12 }, () => '/unknown'),
      userAgents: [],
      activeConnections: 0,
      lastSeen: Date.now()
    });

    const analysis = detector.analyzeRequest(request({
      path: '/unknown',
      originalUrl: '/unknown',
      headers: { 'content-length': '1000' }
    }));

    expect(analysis.threats).toEqual(expect.arrayContaining([
      'Anomaly: Unusual request size',
      'Anomaly: Accessing uncommon paths'
    ]));
  });

  it('covers disabled protections, bandwidth/connection/bot signals, proxy headers, and auto-blocking', () => {
    const disabled = new ThreatDetectionSystem({
      enableDDoSProtection: false,
      enableWAF: false,
      enableAnomalyDetection: false
    });
    expect(disabled.analyzeRequest(request({
      originalUrl: '/search?q=<script>x</script>'
    })).threats).toEqual([]);

    const detector = new ThreatDetectionSystem({
      requestsPerSecond: 100,
      bytesPerSecond: 10,
      connectionLimit: 10
    });
    detector.ipMetrics.set('10.0.0.1', {
      requests: Array.from({ length: 60 }, () => Date.now()),
      totalRequests: 60,
      totalBytes: 1000,
      bytesRecent: 100,
      paths: [],
      userAgents: Array.from({ length: 60 }, () => 'same-agent'),
      activeConnections: 2,
      lastSeen: Date.now()
    });

    const analysis = detector.analyzeRequest(request({
      headers: {
        'content-length': '50',
        'user-agent': 'same-agent',
        'x-forwarded-for': '1,2,3,4,5,6',
        'x-real-ip': '10.0.0.1'
      }
    }));

    expect(analysis.threats).toEqual(expect.arrayContaining([
      'Possible DDoS: High request rate',
      'Possible DDoS: High bandwidth usage',
      'Possible DDoS: Too many concurrent connections',
      'Possible bot: Same user agent for many requests',
      'Suspicious: Too many proxy hops'
    ]));
    expect(analysis.threatLevel).toBe('BLOCKED');
    expect(detector.blockedIPs.has('10.0.0.1')).toBe(true);

    const report = detector.getThreatReport();
    expect(report.criticalThreats[0]).toEqual(expect.objectContaining({ ip: '10.0.0.1' }));
    expect(detector.getSecurityEvents(1)).toHaveLength(1);
    expect(detector.getIPMetrics('missing')).toEqual(expect.objectContaining({
      requests: [],
      activeConnections: 0
    }));
  });

  it('initializes anomaly baselines and handles missing request metadata', () => {
    const detector = new ThreatDetectionSystem();
    const analysis = detector.analyzeRequest(request({
      ip: undefined,
      connection: { remoteAddress: '127.0.0.1' },
      path: undefined,
      method: undefined,
      originalUrl: undefined,
      body: undefined,
      headers: { 'content-length': undefined, 'user-agent': undefined }
    }));

    expect(analysis.clientIp).toBe('127.0.0.1');
    expect(detector.baseline.has('127.0.0.1')).toBe(true);
    expect(detector.getIPMetrics('127.0.0.1').totalBytes).toBe(0);
  });
});
