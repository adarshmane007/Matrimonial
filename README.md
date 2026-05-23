# Sakal Maratha Matrimonial — Frontend

Multi-file Vite static site connected to the [Matrimonial API](../Matrimonial-Backend).

## Project structure

```
Matrimonial/
├── index.html              # Page markup
├── public/assets/          # Images (e.g. wedding photo)
├── src/
│   ├── styles/main.css     # All styles
│   └── js/
│       ├── app.js          # Entry point
│       ├── api.js          # Backend API client
│       ├── auth.js         # Login
│       ├── profiles.js     # Profile cards + featured
│       ├── search.js       # Search form
│       ├── stats.js        # Hero stats from API
│       ├── testimonials.js
│       ├── i18n/           # EN / MR translations
│       └── ui/             # Settings, session
├── .deploy/envs.json       # S3 + CloudFront + API URL
└── .github/workflows/deploy.yml
```

## Features (aligned with backend)

| Feature | API |
|---------|-----|
| Login | `POST /api/auth/login` |
| Register (modal) | `POST /api/auth/register` |
| Search profiles | `GET /api/profiles/search` |
| Featured profiles | `GET /api/profiles/featured` |
| View profile + express interest | `GET /api/profiles/:id`, `POST /api/interests` |
| Contact form | `POST /api/contact` |
| Stats & testimonials | `GET /api/stats`, `GET /api/testimonials` |
| Session restore | `GET /api/auth/me` |

Legacy single file: `sakal-maratha-matrimonial.html` (kept for reference).

## Local development

**With Docker (easiest):** start the [backend stack](../Matrimonial-Backend/LOCAL-DOCKER.md), then:

```bash
cd Matrimonial
cp .env.example .env   # VITE_API_URL=http://localhost:3001
npm install
npm run dev
```

Open http://localhost:5173

**Backend only:** see [Matrimonial-Backend/LOCAL-DOCKER.md](../Matrimonial-Backend/LOCAL-DOCKER.md) — `docker compose up -d --build` in `Matrimonial-Backend`.

## Deploy to AWS

1. Edit `.deploy/envs.json` (bucket, optional CloudFront ID, `api_url`).
2. Add GitHub secrets `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
3. Run workflow **Deploy Matrimonial Frontend to S3**.

Build output is published to the S3 bucket root `s3://<bucket>/` and should be served as an S3 static website.
Set the bucket's static website hosting index document and error document to `index.html`.

## Backend CORS

Set backend `CORS_ORIGIN` to your S3 website URL or custom domain, e.g. `http://<bucket-name>.s3-website.<region>.amazonaws.com` or `https://matrimonial.yourdomain.com`.
