# Vorpet Question Paper Generator
## Pipeline: Bhashini OCR → BharatGen LLM → Bhashini Translate → PDF
## Cost: ₹0

---

## Run Locally (Docker)

### Step 1 — Add your Bhashini API keys
Edit `.env` file:
```
BHASHINI_USER_ID=your_user_id
BHASHINI_API_KEY=your_api_key
```
Get free keys at: https://bhashini.gov.in/ulca/model/api-integration

### Step 2 — Start everything
```bash
docker compose up --build
```
First run downloads the BharatGen model (~2GB). Takes 5-10 minutes once.

### Step 3 — Test it
Open browser: http://localhost:8000
API health:   http://localhost:8000/api/health

### Step 4 — Test API with your textbook image
```bash
curl -X POST http://localhost:8000/api/generate \
  -F "images=@your_textbook_page.jpg" \
  -F "marks_1=5" \
  -F "marks_5=3" \
  -F "language=bengali" \
  -F "school_name=My School" \
  -F "class_name=Class VIII" \
  -F "subject=গণিত"
```

---

## Deploy to Your Server (KVM 2 — 187.127.150.252)

### Step 1 — Copy files to server
```bash
scp -r . root@187.127.150.252:/var/www/vorpet-qgen/
```

### Step 2 — SSH into server
```bash
ssh root@187.127.150.252
cd /var/www/vorpet-qgen
```

### Step 3 — Install Docker on server (if not done)
```bash
curl -fsSL https://get.docker.com | sh
```

### Step 4 — Start on server
```bash
docker compose up -d --build
```

### Step 5 — Test
```bash
curl http://187.127.150.252:8000/api/health
```

---

## Project Structure
```
vorpet_qgen/
├── app/
│   ├── main.py                    ← FastAPI app
│   └── services/
│       ├── ocr_service.py         ← Bhashini OCR (FREE)
│       ├── llm_service.py         ← BharatGen LLM (FREE)
│       ├── translate_service.py   ← Bhashini Translate (FREE)
│       └── pdf_service.py         ← WeasyPrint PDF (FREE)
├── static/
│   └── index.html                 ← Placeholder (React comes next)
├── uploads/                       ← Temp image storage
├── outputs/                       ← Generated PDFs
├── Dockerfile                     ← FastAPI container
├── docker-compose.yml             ← All services together
├── requirements.txt               ← Python packages
└── .env                           ← Your API keys
```

---

## API Reference

### POST /api/generate
| Field | Type | Default | Description |
|---|---|---|---|
| images | file[] | required | Textbook page photos |
| marks_1 | int | 5 | Number of 1-mark questions |
| marks_5 | int | 3 | Number of 5-mark questions |
| language | string | bengali | bengali / hindi / english |
| school_name | string | "" | School name for PDF header |
| class_name | string | Class VIII | Class for PDF header |
| subject | string | গণিত | Subject name |

### Response
```json
{
  "success": true,
  "pdf_url": "/outputs/qpaper_abc12345.pdf",
  "questions": {
    "marks_1_questions": [...],
    "marks_5_questions": [...]
  }
}
```
