const {
  createConnection,
  ProposedFeatures,
  TextDocumentSyncKind,
  CompletionItemKind,
  InsertTextFormat,
  DiagnosticSeverity
} = require('vscode-languageserver/node');
const { TextDocuments } = require('vscode-languageserver/node');
const { TextDocument } = require('vscode-languageserver-textdocument');
const AutoFormatter = require('./AutoFormatter');
const data = require('./intellisenseData');

class EasyJSLanguageServer {
  constructor() {
    this.connection = createConnection(ProposedFeatures.all);
    this.documents = new TextDocuments(TextDocument);
    this.formatter = new AutoFormatter();
    this.initialize();
  }

  initialize() {
    this.connection.onInitialize(() => ({
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Full,
        completionProvider: {
          resolveProvider: false,
          triggerCharacters: ['<', '/', ' ', ':', '.', '"', "'", '@']
        },
        hoverProvider: true,
        documentFormattingProvider: true
      }
    }));

    this.connection.onCompletion(params => this.provideCompletions(params));
    this.connection.onHover(params => this.provideHover(params));
    this.connection.onDocumentFormatting(params => this.formatDocument(params));

    this.documents.onDidOpen(change => this.validateDocument(change.document));
    this.documents.onDidChangeContent(change => this.validateDocument(change.document));

    this.documents.listen(this.connection);
    this.connection.listen();
  }

  provideCompletions(params) {
    const doc = this.documents.get(params.textDocument.uri);
    if (!doc) return [];

    const language = this.detectLanguage(doc);
    const line = doc.getText({
      start: { line: params.position.line, character: 0 },
      end: params.position
    });

    if (language === 'easy') return this.easyCompletions(line);
    return this.webCompletions(line);
  }

  easyCompletions(line) {
    const completions = [];
    completions.push(...data.easyKeywords.map(keyword => this.snippet(keyword, keyword, CompletionItemKind.Keyword)));

    if (/MODEL\s+\w+\s*\{[^}]*$/i.test(line) || /^\s*\w*\s*:?\s*$/.test(line)) {
      completions.push(...data.easyTypes.map(type => this.item(type, `easy.js type: ${type}`, CompletionItemKind.TypeParameter)));
    }

    if (/VALIDATE\s+\w+\s*\{[^}]*$/i.test(line) || line.includes(':')) {
      completions.push(...data.validationRules.map(rule => this.item(rule, `Validation rule: ${rule}`, CompletionItemKind.Value)));
    }

    Object.entries(data.emmetAbbreviations).forEach(([abbr, expansion]) => {
      completions.push(this.snippet(abbr, expansion, CompletionItemKind.Snippet, `Expand ${abbr}`));
    });

    return completions;
  }

  webCompletions(line) {
    const completions = [];
    const trimmed = line.trimEnd();

    if (trimmed.endsWith('<') || /<[a-zA-Z0-9-]*$/.test(trimmed)) {
      completions.push(...data.htmlTags.map(tag =>
        this.snippet(tag, `${tag}>$0</${tag}>`, CompletionItemKind.Property, `<${tag}>`)
      ));
    }

    if (/<[a-zA-Z][^>]*\s+[a-zA-Z-]*$/.test(trimmed)) {
      completions.push(...data.htmlAttributes.map(attr =>
        this.snippet(attr, `${attr}="$0"`, CompletionItemKind.Field, `HTML attribute: ${attr}`)
      ));
    }

    if (/(className|class)=["'][^"']*$/.test(trimmed)) {
      completions.push(...data.tailwindClasses.map(cls => this.item(cls, `Tailwind: ${cls}`, CompletionItemKind.Value)));
      completions.push(...data.bootstrapClasses.map(cls => this.item(cls, `Bootstrap: ${cls}`, CompletionItemKind.Value)));
    }

    completions.push(...data.materialComponents.map(component =>
      this.item(component, `Material UI component: ${component}`, CompletionItemKind.Class)
    ));

    Object.keys(data.emmetAbbreviations).forEach(abbr => {
      completions.push(this.snippet(abbr, data.emmetAbbreviations[abbr], CompletionItemKind.Snippet, `Emmet: ${abbr}`));
    });

    return completions;
  }

  provideHover(params) {
    const doc = this.documents.get(params.textDocument.uri);
    if (!doc) return null;

    const text = doc.getText({
      start: { line: params.position.line, character: 0 },
      end: { line: params.position.line, character: Number.MAX_SAFE_INTEGER }
    });
    const word = this.wordAt(text, params.position.character);

    const docs = {
      MODEL: 'Defines a database model and its fields.',
      AUTH: 'Enables authentication for a model.',
      PROTECT: 'Requires authentication for matching routes.',
      VALIDATE: 'Adds request validation rules.',
      SECURITY: 'Enables a security preset such as `strict`.',
      div: 'HTML container element.',
      className: 'React/JSX class attribute.',
      flex: 'CSS utility for flexbox layout.',
      'bg-blue-500': 'Tailwind background color utility.'
    };

    if (!docs[word]) return null;
    return { contents: { kind: 'markdown', value: docs[word] } };
  }

  formatDocument(params) {
    const doc = this.documents.get(params.textDocument.uri);
    if (!doc) return [];
    const text = doc.getText();
    const formatted = this.detectLanguage(doc) === 'easy'
      ? this.formatEasy(text)
      : this.formatter.formatCode(text);

    if (text === formatted) return [];
    return [{
      range: {
        start: { line: 0, character: 0 },
        end: doc.positionAt(text.length)
      },
      newText: formatted
    }];
  }

  formatEasy(text) {
    return text
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (trimmed === '}') return '}';
        if (/^\w+\s*:/.test(trimmed)) return `  ${trimmed}`;
        return trimmed;
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
  }

  validateDocument(doc) {
    const diagnostics = this.detectLanguage(doc) === 'easy'
      ? this.validateEasy(doc)
      : this.validateWeb(doc);
    this.connection.sendDiagnostics({ uri: doc.uri, diagnostics });
  }

  validateEasy(doc) {
    const diagnostics = [];
    const text = doc.getText();
    const lines = text.split('\n');

    if (!/\bSTART\s+SERVER\s+\d+/i.test(text)) {
      diagnostics.push(this.diagnostic(0, 0, 1, 'Missing `START SERVER <port>` declaration.'));
    }

    lines.forEach((line, index) => {
      if (/JWT_SECRET\s*=\s*(change|replace|your-secret)/i.test(line)) {
        diagnostics.push(this.diagnostic(index, 0, line.length, 'Do not use placeholder secrets in production.', DiagnosticSeverity.Warning));
      }
      if (/MODEL\s+\w+\s*\{/.test(line) && !text.slice(text.indexOf(line)).includes('}')) {
        diagnostics.push(this.diagnostic(index, 0, line.length, 'Model block is missing a closing brace.'));
      }
    });

    return diagnostics;
  }

  validateWeb(doc) {
    return this.formatter.validateSyntax(doc.getText()).map(error => {
      const pos = doc.positionAt(error.position || 0);
      return {
        severity: error.type === 'warning' ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error,
        range: { start: pos, end: { line: pos.line, character: pos.character + 1 } },
        message: error.message,
        source: 'easy.js'
      };
    });
  }

  diagnostic(line, start, end, message, severity = DiagnosticSeverity.Error) {
    return {
      severity,
      range: { start: { line, character: start }, end: { line, character: end } },
      message,
      source: 'easy.js'
    };
  }

  detectLanguage(doc) {
    return doc.uri.endsWith('.easy') ? 'easy' : 'web';
  }

  item(label, detail, kind) {
    return { label, detail, kind, insertText: label };
  }

  snippet(label, insertText, kind, detail = null) {
    return { label, detail: detail || label, kind, insertText, insertTextFormat: InsertTextFormat.Snippet };
  }

  wordAt(line, position) {
    let start = position;
    let end = position;
    while (start > 0 && /[\w:-]/.test(line[start - 1])) start--;
    while (end < line.length && /[\w:-]/.test(line[end])) end++;
    return line.slice(start, end);
  }
}

if (require.main === module) {
  new EasyJSLanguageServer();
}

module.exports = EasyJSLanguageServer;
