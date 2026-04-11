# Banka-3-Mobile

## Pokretanje

Ako ne podesite nista, aplikacija gadja lokalni backend na `http://localhost:8081/api`.

Za backend koji vraca JWT tokene:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://localhost:8081/api"
$env:EXPO_PUBLIC_USE_MOCK="false"
npm start -- --web --port 5173
```

Endpoint-i:

- `POST /login`
- `POST /token/refresh`
- `POST /logout`

Ako zelite mock mod eksplicitno:

```powershell
$env:EXPO_PUBLIC_USE_MOCK="true"
npm start -- --web --port 5173
```
