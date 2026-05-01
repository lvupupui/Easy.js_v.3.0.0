# easy.js IDE Support

The framework ships editor support for `.easy`, HTML, JSX, Vue, Svelte, CSS, Tailwind, Bootstrap, and Material UI.

## Features

- `.easy` language registration
- `.easy` autocomplete for server, database, models, auth, routes, roles, jobs, validation, security, docs, and admin declarations
- HTML tag and attribute autocomplete
- Tailwind and Bootstrap class suggestions
- Material UI component suggestions
- Emmet-like expansions such as `!`, `html:5`, `form:login`, `api:crud`, `model:user`, and `auth:secure`
- Hover explanations for easy.js and frontend symbols
- Formatting support
- Diagnostics for missing server declarations, placeholder secrets, JSX syntax issues, and accessibility warnings

## Commands

- `easy.js: Expand Abbreviation`
- `easy.js: Create Backend`

## Example Expansions

```text
api:crud
model:user
auth:secure
form:login
div#app.container
ul>li*3
```
