# Banka 3 - Mobile App

> Mobilna aplikacija za banku namenjena klijentima.

---

## Vazno — Expo Go verzija

Ovaj projekat koristi **Expo SDK 55**, što znači da mora da se koristi **tačno ova verzija Expo Go aplikacije**.

**[Preuzmi Expo Go — https://expo.dev/go](https://expo.dev/go)**

Otvori link na telefonu i odaberi verziju za **Android** ili **iOS**.

> **Napomena:** Ako koristis noviju verziju Expo Go od SDK 55, aplikacija se **nece pokrenuti**. Na stranici izaberi tacno SDK 55.

---

## Pokretanje aplikacije

### Preduslovi

- [Node.js 18+](https://nodejs.org/)
- [Git](https://git-scm.com/)
- Expo Go **SDK 55** na telefonu (vidi gore)

### Koraci

```bash
# 1. Kloniraj repozitorijum
git clone <repo-url>
cd banka-mobile

# 2. Instaliraj zavisnosti
npm install

# 3. Pokreni backend (vidi sekciju ispod)

# 4. Pokreni razvojni server putem tunela
npm run start:tunnel
```

> **Zasto `start:tunnel`?** Tunnel mod omogucava da se aplikacija poveze sa backendom cak i kada telefon i racunar nisu na istoj WiFi mrezi. **Uvek koristiti ovu komandu**, ne `npx expo start`.

### Skeniranje QR koda

Nakon sto se server pokrene, u terminalu ce se pojaviti **QR kod**.

Skeniraj ga telefonom:
- **Android** — otvori Expo Go aplikaciju i pritisni "Scan QR code"
- **iOS** — skeniraj standardnom kamerom telefona, pa otvori u Expo Go

### Testiranje aplikacije

Celokupno rukovanje i testiranje aplikacije vrsi se **iskljucivo sa telefona** kroz Expo Go. Nema potrebe za emulatorom ili browser-om.

Ako server i dalje radi u terminalu, aplikacija je ziva na telefonu — promene u kodu se automatski reflektuju (hot reload).

---

## Pokretanje backenda

Backend tim pokrece Go/REST server lokalno putem Docker Compose-a.

### Koraci

```bash
# 1. Udjji u folder backenda
cd <backend-folder>

# 2. Kopiraj environment fajl
cp .env.example .env

# 3. Pokreni sve servise
make all
```

> `make all` ce pokrenuti Docker Compose i sve potrebne servise (baza, gateway, itd.). Backend ce biti dostupan na portu `8080`.

### Konfiguracija mobilne aplikacije

U fajlu `src/core/di/container.ts` postoji `USE_MOCK` flag:

```ts
const USE_MOCK = false; // true = mock podaci, false = pravi backend
```

Ako koristis pravi backend, postavi IP adresu svog racunara u `NetworkClient`:

```ts
// src/core/network/NetworkClient.ts
const BASE_URL = "http://<IP_ADRESA_RACUNARA>:8080";
```

> `localhost` ne radi na fizickom telefonu — koristi lokalnu IP adresu racunara (npr. `192.168.1.102`).

---

## Tech Stack

| Tehnologija | Verzija |
|------------|---------|
| Expo SDK | 55.0.5 |
| React Native | 0.83.2 |
| React | 19.2.0 |
| TypeScript | 5.9.2 |
| Expo Router | file-based navigacija |
