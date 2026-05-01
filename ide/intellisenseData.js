const htmlTags = [
  'a', 'article', 'aside', 'button', 'canvas', 'div', 'fieldset', 'footer',
  'form', 'h1', 'h2', 'h3', 'header', 'img', 'input', 'label', 'li', 'main',
  'nav', 'ol', 'option', 'p', 'section', 'select', 'span', 'strong', 'table',
  'tbody', 'td', 'textarea', 'th', 'thead', 'tr', 'ul', 'video'
];

const htmlAttributes = [
  'id', 'class', 'className', 'style', 'role', 'aria-label', 'data-testid',
  'href', 'src', 'alt', 'type', 'name', 'value', 'placeholder', 'required',
  'disabled', 'checked', 'selected', 'onClick', 'onChange', 'onSubmit'
];

const easyKeywords = [
  'START SERVER', 'USE MONGODB', 'USE MYSQL', 'USE POSTGRESQL', 'MODEL',
  'AUTH users BY jwt', 'AUTH refresh_tokens enabled',
  'AUTH password_reset enabled', 'AUTH email_verification enabled',
  'SECURITY strict', 'DOCS openapi', 'ADMIN enabled', 'GET', 'POST', 'PUT',
  'PATCH', 'DELETE', 'FROM', 'PROTECT', 'VALIDATE', 'ROLE admin CAN *', 'JOB'
];

const easyTypes = [
  'string', 'email', 'password', 'number', 'integer', 'boolean', 'date',
  'datetime', 'object', 'array', 'json', 'uuid', 'text'
];

const validationRules = [
  'required', 'email', 'min=2', 'min=8', 'max=255', 'url', 'uuid', 'number',
  'boolean', 'date'
];

const tailwindClasses = [
  'container', 'mx-auto', 'flex', 'inline-flex', 'grid', 'block', 'hidden',
  'items-center', 'items-start', 'items-end', 'justify-between',
  'justify-center', 'gap-2', 'gap-3', 'gap-4', 'gap-6', 'space-y-2',
  'space-y-4', 'p-2', 'p-3', 'p-4', 'p-6', 'px-3', 'px-4', 'py-2', 'py-3',
  'm-2', 'm-4', 'mt-2', 'mt-4', 'mb-2', 'mb-4', 'w-full', 'h-full',
  'min-h-screen', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-4xl',
  'rounded', 'rounded-md', 'rounded-lg', 'border', 'border-gray-200',
  'bg-white', 'bg-gray-50', 'bg-gray-100', 'bg-gray-900', 'bg-blue-500',
  'bg-green-500', 'bg-red-500', 'text-sm', 'text-base', 'text-lg',
  'text-xl', 'text-2xl', 'font-medium', 'font-semibold', 'font-bold',
  'text-white', 'text-gray-500', 'text-gray-700', 'text-gray-900',
  'shadow', 'shadow-sm', 'shadow-md', 'hover:bg-blue-600',
  'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500'
];

const bootstrapClasses = [
  'container', 'container-fluid', 'row', 'col', 'col-md-6', 'col-lg-4',
  'd-flex', 'd-grid', 'align-items-center', 'justify-content-between',
  'gap-2', 'gap-3', 'p-2', 'p-3', 'p-4', 'm-2', 'm-3', 'mb-3', 'mt-4',
  'btn', 'btn-primary', 'btn-secondary', 'btn-danger', 'form-control',
  'form-label', 'card', 'card-body', 'card-title', 'table', 'table-striped',
  'alert', 'alert-success', 'alert-danger', 'navbar', 'nav-link'
];

const materialComponents = [
  'Button', 'TextField', 'Container', 'Box', 'Stack', 'Grid', 'Card',
  'CardContent', 'CardActions', 'Typography', 'Dialog', 'DialogTitle',
  'DialogContent', 'AppBar', 'Toolbar', 'IconButton', 'Menu', 'MenuItem'
];

const emmetAbbreviations = {
  '!': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${1:Document}</title>\n</head>\n<body>\n  $0\n</body>\n</html>',
  'html:5': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${1:Document}</title>\n</head>\n<body>\n  $0\n</body>\n</html>',
  'form:login': '<form onSubmit={${1:handleSubmit}} className="${2:space-y-4}">\n  <input type="email" name="email" placeholder="Email" required />\n  <input type="password" name="password" placeholder="Password" required />\n  <button type="submit">Sign in</button>\n</form>',
  'api:crud': 'GET /${1:items} FROM ${1:items}\nGET /${1:items}/:id FROM ${1:items}\nPOST /${1:items} FROM ${1:items}\nPUT /${1:items}/:id FROM ${1:items}\nDELETE /${1:items}/:id FROM ${1:items}\nPROTECT /${1:items}',
  'model:user': 'MODEL users {\n  name: string\n  email: email\n  password: password\n  role: string\n  createdAt: date\n}',
  'auth:secure': 'AUTH users BY jwt\nAUTH refresh_tokens enabled\nAUTH password_reset enabled\nAUTH email_verification enabled'
};

function expandSimpleEmmet(abbreviation) {
  if (emmetAbbreviations[abbreviation]) return emmetAbbreviations[abbreviation];

  const match = abbreviation.match(/^([a-z][a-z0-9-]*)(#[a-zA-Z0-9_-]+)?((?:\.[a-zA-Z0-9_-]+)*)(?:>([a-z][a-z0-9-]*))?(?:\*(\d+))?$/);
  if (!match) return null;

  const [, tag, idPart, classPart, childTag, countPart] = match;
  const id = idPart ? ` id="${idPart.slice(1)}"` : '';
  const classes = classPart ? ` className="${classPart.split('.').filter(Boolean).join(' ')}"` : '';
  const count = Math.min(parseInt(countPart || '1', 10), 20);

  const child = childTag ? `<${childTag}>$0</${childTag}>` : '$0';
  const node = `<${tag}${id}${classes}>${child}</${tag}>`;
  return Array.from({ length: count }, () => node).join('\n');
}

module.exports = {
  htmlTags,
  htmlAttributes,
  easyKeywords,
  easyTypes,
  validationRules,
  tailwindClasses,
  bootstrapClasses,
  materialComponents,
  emmetAbbreviations,
  expandSimpleEmmet
};
