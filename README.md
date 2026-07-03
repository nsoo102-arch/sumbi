# 숨비소리 (Sumbi)

Beta 0.1 — A calm, minimal breath journaling app.

## Tech Stack

- Next.js 15
- TypeScript
- Tailwind CSS

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing |
| `/login` | Email, Google, or Guest login |
| `/profile` | Name and 숨이름 setup |
| `/breath` | Today's breath activity |
| `/record` | Activity reflection |
| `/saved` | Confirmation |

## Data

All user data is stored in `localStorage` only. No backend or Supabase integration yet.

## Design

- Background: `#F8F6F1` (warm ivory)
- Primary: `#2E7D7A`
- Minimal layout with generous whitespace
