const vscode = require('vscode');
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');
const data = require('./intellisenseData');

let client;

const EASY_SELECTOR = { scheme: 'file', language: 'easy' };
const WEB_LANGUAGES = [
  'html', 'css', 'scss', 'javascript', 'javascriptreact',
  'typescript', 'typescriptreact', 'vue', 'svelte'
];
const WEB_SELECTORS = WEB_LANGUAGES.map(language => ({ scheme: 'file', language }));

function activate(context) {
  ensureEasyLanguageRegistration(context);
  startLanguageServer(context);

  const subscriptions = [
    registerEasyCompletionProvider(),
    registerWebCompletionProvider(),
    registerHoverProvider(),
    registerEmmetCommand(),
    registerCreateBackendCommand()
  ];

  context.subscriptions.push(...subscriptions);
  vscode.window.showInformationMessage('easy.js IntelliSense ready: .easy, HTML, CSS, Tailwind, Bootstrap, React, Vue, and Svelte.');
}

function ensureEasyLanguageRegistration(context) {
  context.subscriptions.push(vscode.languages.setLanguageConfiguration('easy', {
    comments: { lineComment: '#', blockComment: ['/*', '*/'] },
    brackets: [['{', '}'], ['(', ')'], ['[', ']']],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ]
  }));
}

function startLanguageServer(context) {
  const serverModule = context.asAbsolutePath('ide/LSPServer.js');
  const serverOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc }
  };

  const clientOptions = {
    documentSelector: [EASY_SELECTOR, ...WEB_SELECTORS],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{easy,js,jsx,ts,tsx,html,css,scss,vue,svelte}')
    }
  };

  client = new LanguageClient('easyjs', 'easy.js Language Server', serverOptions, clientOptions);
  context.subscriptions.push(client.start());
}

function registerEasyCompletionProvider() {
  return vscode.languages.registerCompletionItemProvider(
    EASY_SELECTOR,
    {
      provideCompletionItems(document, position) {
        const line = document.lineAt(position.line).text.slice(0, position.character);
        const items = [];

        items.push(...data.easyKeywords.map(keyword => completion(keyword, keyword, vscode.CompletionItemKind.Keyword)));
        items.push(...data.easyTypes.map(type => completion(type, `Type: ${type}`, vscode.CompletionItemKind.TypeParameter)));
        items.push(...data.validationRules.map(rule => completion(rule, `Validation: ${rule}`, vscode.CompletionItemKind.Value)));

        if (line.trim().length > 0) {
          const token = line.trim().split(/\s+/).pop();
          const expanded = data.expandSimpleEmmet(token);
          if (expanded) {
            items.push(snippet(`Expand ${token}`, expanded, `Emmet-like expansion: ${token}`));
          }
        }

        items.push(snippet('model:user', data.emmetAbbreviations['model:user'], 'User model'));
        items.push(snippet('auth:secure', data.emmetAbbreviations['auth:secure'], 'Secure auth block'));
        items.push(snippet('api:crud', data.emmetAbbreviations['api:crud'], 'Protected CRUD routes'));

        return items;
      }
    },
    ' ', ':', '.', '\n'
  );
}

function registerWebCompletionProvider() {
  return vscode.languages.registerCompletionItemProvider(
    WEB_SELECTORS,
    {
      provideCompletionItems(document, position) {
        const line = document.lineAt(position.line).text.slice(0, position.character);
        const items = [];

        if (line.endsWith('<') || /<[a-zA-Z0-9-]*$/.test(line)) {
          items.push(...data.htmlTags.map(tag => snippet(tag, `${tag}>$0</${tag}>`, `<${tag}>`)));
        }

        if (/<[a-zA-Z][^>]*\s+[a-zA-Z-]*$/.test(line)) {
          items.push(...data.htmlAttributes.map(attr => snippet(attr, `${attr}="$0"`, `HTML attribute: ${attr}`)));
        }

        if (/(className|class)=["'][^"']*$/.test(line)) {
          items.push(...data.tailwindClasses.map(cls => completion(cls, `Tailwind: ${cls}`, vscode.CompletionItemKind.Value)));
          items.push(...data.bootstrapClasses.map(cls => completion(cls, `Bootstrap: ${cls}`, vscode.CompletionItemKind.Value)));
        }

        items.push(...data.materialComponents.map(component =>
          snippet(component, `<${component}>$0</${component}>`, `Material UI: ${component}`)
        ));

        const token = line.trim().split(/\s+/).pop();
        const expanded = data.expandSimpleEmmet(token);
        if (expanded) {
          items.push(snippet(`Expand ${token}`, expanded, `Emmet-like expansion: ${token}`));
        }

        return items;
      }
    },
    '<', '/', ' ', '.', '#', '"', "'"
  );
}

function registerHoverProvider() {
  return vscode.languages.registerHoverProvider(
    [EASY_SELECTOR, ...WEB_SELECTORS],
    {
      provideHover(document, position) {
        const range = document.getWordRangeAtPosition(position, /[\w:-]+/);
        if (!range) return null;
        const word = document.getText(range);
        const docs = {
          MODEL: 'Defines a backend model and database schema.',
          AUTH: 'Enables authentication for a model.',
          SECURITY: 'Applies security defaults. Use `SECURITY strict` for production-friendly defaults.',
          PROTECT: 'Requires authentication for matching routes.',
          VALIDATE: 'Adds validation rules for request payloads.',
          flex: 'CSS utility for flexbox layout.',
          'btn-primary': 'Common button class in Bootstrap-like systems.',
          className: 'React/JSX class attribute.'
        };
        if (!docs[word]) return null;
        return new vscode.Hover(new vscode.MarkdownString(docs[word]));
      }
    }
  );
}

function registerEmmetCommand() {
  return vscode.commands.registerCommand('easyjs.expandAbbreviation', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const position = editor.selection.active;
    const line = editor.document.lineAt(position.line).text;
    const before = line.slice(0, position.character);
    const match = before.match(/([!:\w.#>*-]+)$/);
    if (!match) {
      vscode.window.showWarningMessage('No easy.js abbreviation found before cursor.');
      return;
    }

    const abbreviation = match[1];
    const expanded = data.expandSimpleEmmet(abbreviation);
    if (!expanded) {
      vscode.window.showWarningMessage(`No expansion for ${abbreviation}`);
      return;
    }

    const start = new vscode.Position(position.line, position.character - abbreviation.length);
    await editor.insertSnippet(new vscode.SnippetString(expanded), new vscode.Range(start, position));
  });
}

function registerCreateBackendCommand() {
  return vscode.commands.registerCommand('easyjs.createBackend', async () => {
    const name = await vscode.window.showInputBox({ prompt: 'Backend project name', value: 'my-api' });
    if (!name) return;
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!folder) {
      vscode.window.showErrorMessage('Open a workspace folder first.');
      return;
    }
    const terminal = vscode.window.createTerminal('easy.js');
    terminal.show();
    terminal.sendText(`easyjs create ${name}`);
  });
}

function completion(label, detail, kind) {
  const item = new vscode.CompletionItem(label, kind);
  item.detail = detail;
  return item;
}

function snippet(label, body, detail) {
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
  item.insertText = new vscode.SnippetString(body);
  item.detail = detail;
  item.sortText = `0_${label}`;
  return item;
}

function deactivate() {
  if (!client) return undefined;
  return client.stop();
}

module.exports = { activate, deactivate };
