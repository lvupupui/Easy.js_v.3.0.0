const { escapeHtml, AdminDashboardGenerator } = require('../../admin/dashboardGenerator');

describe('AdminDashboardGenerator XSS prevention', () => {
  describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
      expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('escapes double quotes', () => {
      expect(escapeHtml('value"onclick="evil()')).toBe('value&quot;onclick=&quot;evil()');
    });

    it('escapes single quotes', () => {
      expect(escapeHtml("d'angle")).toBe('d&#x27;angle');
    });

    it('escapes ampersands', () => {
      expect(escapeHtml('a&b')).toBe('a&amp;b');
    });

    it('returns empty string for null/undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    it('converts numbers to strings', () => {
      expect(escapeHtml(42)).toBe('42');
    });

    it('passes safe text through unchanged', () => {
      expect(escapeHtml('Hello, World!')).toBe('Hello, World!');
      expect(escapeHtml('normal text with spaces')).toBe('normal text with spaces');
    });
  });

  describe('Dashboard HTML escaping', () => {
    let generator;
    const mockDb = { query: jest.fn() };
    const safeModel = 'users';
    const xssModel = '<script>evil</script>';

    beforeEach(() => {
      generator = new AdminDashboardGenerator(mockDb, [{ name: safeModel, fields: { email: 'string' } }]);
    });

    it('escapes model names in list HTML', () => {
      const html = generator.generateListHTML(xssModel);
      expect(html).not.toContain('<script>evil</script>');
      expect(html).toContain('&lt;script&gt;evil&lt;/script&gt;');
    });

    it('escapes model names in detail HTML', () => {
      const html = generator.generateDetailHTML(xssModel, '1');
      expect(html).not.toContain('<script>evil</script>');
      expect(html).toContain('&lt;script&gt;evil&lt;/script&gt;');
    });

    it('escapes IDs in detail HTML', () => {
      const html = generator.generateDetailHTML('user', '<script>bad</script>');
      expect(html).not.toContain('<script>bad</script>');
      expect(html).toContain('&lt;script&gt;bad&lt;/script&gt;');
    });

    it('generates safe dashboard JS with createElement', () => {
      const js = generator.getDashboardJS();
      // Should not use innerHTML with string concatenation of untrusted data
      expect(js).not.toContain("innerHTML = stats.models.map");
      expect(js).not.toContain("innerHTML = models.map");
      // Should use safe DOM methods
      expect(js).toContain('createElement');
      expect(js).toContain('textContent');
    });
  });
});
