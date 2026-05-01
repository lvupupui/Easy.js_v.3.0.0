# Getting Started with easy.js

easy.js is designed around one promise: describe the backend you want, and let the framework handle the Express and Node.js wiring.

## Create a Backend

```bash
npx easyjs create my-api
cd my-api
npm install
npm run doctor
npm run dev
```

## The Starter Structure

```text
my-api/
├─ src/
│  ├─ app.easy
│  ├─ models.easy
│  ├─ auth.easy
│  ├─ routes.easy
│  └─ jobs.easy
├─ config/
│  └─ easy.config.js
├─ tests/
├─ migrations/
├─ seeds/
├─ docs/
├─ Dockerfile
├─ docker-compose.yml
├─ .env
└─ package.json
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
easyjs add crud products
easyjs add job dailyReport
```

## Check the Project

```bash
easyjs doctor
```

The doctor command checks the files and security basics that most new projects forget.
