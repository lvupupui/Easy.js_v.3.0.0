# AI, Cloud, and DevOps Support

easy.js includes first-class integration points for current AI SDKs, cloud storage providers, and production deployment targets.

## AI Providers

Use `AIProviderManager` to call hosted model providers through one framework API.

```js
const { AIProviderManager } = require('easy.js');

const ai = new AIProviderManager({
  defaultProvider: 'openai'
});

const result = await ai.complete('Generate a secure API route');
console.log(result.text);
```

Supported providers:

- OpenAI through the official `openai` SDK and Responses API.
- Google Gemini through `@google/genai`.
- Anthropic through `@anthropic-ai/sdk`.
- OpenAI embeddings through `text-embedding-3-large` by default.

Set provider credentials with environment variables:

```bash
OPENAI_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
AI_PROVIDER=openai
```

The app factory automatically mounts `POST /ai/complete` unless `enableAI` is set to `false`.

## Cloud SDKs

Cloud storage supports:

- Amazon S3 through AWS SDK for JavaScript v3.
- Google Cloud Storage through `@google-cloud/storage`.
- Azure Blob Storage through `@azure/storage-blob`.

DynamoDB now uses the modular AWS SDK v3 clients:

- `@aws-sdk/client-dynamodb`
- `@aws-sdk/lib-dynamodb`

## Deployment

Included deployment targets:

- Docker multi-stage production image.
- Docker Compose for local MySQL, PostgreSQL, MongoDB, Redis, and Elasticsearch.
- Kubernetes deployment in `k8s/deployment.yml`.
- Helm chart in `helm/easyjs`.
- AWS ECS/Fargate Terraform stack in `terraform/aws`.
- GitHub Actions CI running dependency verification, tests, coverage, and migrations.
- External process managers can still run the app, but PM2 is not bundled because its current npm package has an unfixed advisory.

## Modern Runtime Baseline

The framework targets Node.js 20+ and uses Node 24 in Docker and CI. Frontend generation dependencies are updated for React 19 and Vite 8.
