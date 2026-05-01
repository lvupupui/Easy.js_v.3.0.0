# Getting Started with easy.js

easy.js is designed around one promise: describe the backend you want, and let the framework handle the Express and Node.js wiring.

## Create a Backend

```bash
npx easybackend.js create my-api
cd my-api
npm install
npm run doctor
npm run dev
```

Open `http://localhost:3000/` for the starter UI with the easy.js logo, health links, and generated routes.

The generated `template/` folder contains plain HTML, CSS, and JavaScript. Edit those files to design the UI that talks to your backend.

Choose a UI preset when creating a project:

```bash
npx easybackend.js create my-api --ui bootstrap
npx easybackend.js create my-api --ui tailwind
```

Or add one later:

```bash
easyjs add ui bootstrap
easyjs add ui tailwind
```

## The Starter Structure

```text
my-api/
|-- src/
|   |-- app.easy
|   |-- models.easy
|   |-- auth.easy
|   |-- routes.easy
|   `-- jobs.easy
|-- config/
|   `-- easy.config.js
|-- tests/
|-- migrations/
|-- seeds/
|-- docs/
|-- template/
|   |-- index.html
|   |-- styles.css
|   `-- app.js
|-- Dockerfile
|-- docker-compose.yml
|-- .env
`-- package.json
```

## Small Example

```easy
START SERVER 3000
USE MONGODB mongodb://localhost:27017/blog

SECURITY strict
DOCS openapi
ADMIN enabled

MODEL posts {
  title: string
  content: string
  published: boolean
}

AUTH users BY jwt

GET /posts FROM posts
POST /posts FROM posts
PROTECT /posts

VALIDATE posts {
  title: required:min=3
  content: required
}
```

## Add More

```bash
easyjs add model Product
easyjs add route products
easyjs add crud products
easyjs add auth jwt
easyjs add database postgres
easyjs add job dailyReport
```

`easyjs add database postgres` updates the `USE` directive and adds `pg` to `package.json`.

## Check the Project

```bash
easyjs doctor
```

The doctor command checks required files, security basics, and provider packages. If you select a provider without the matching package, it tells you the exact install command:

```text
You use PostgreSQL but pg is missing. Run npm install pg.
```

Use `/?format=json` when you want the machine-readable starter status payload.
