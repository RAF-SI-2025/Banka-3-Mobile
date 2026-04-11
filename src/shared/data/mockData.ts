export const MOCK_USER = {
  firstName: 'Marko', lastName: 'Petrović',
  email: 'marko.petrovic@gmail.com', phone: '+381641234567',
  address: 'Knez Mihailova 25, Beograd',
};

export const MOCK_ACCOUNTS = [
  { id: 1, name: 'Tekući račun', number: '265-0000000011234-56', currency: 'RSD', balance: 347250.0, available: 335750.0 },
  { id: 2, name: 'Devizni račun', number: '265-0000000011234-78', currency: 'EUR', balance: 2150.0, available: 2150.0 },
  { id: 3, name: 'Štedni račun', number: '265-0000000011234-90', currency: 'RSD', balance: 1200000.0, available: 1200000.0 },
];

export const MOCK_TRANSACTIONS = [
  { id: 1, accountId: 1, desc: 'Mesečna rata kredita', amount: -15420.0, date: '05.03.2025', status: 'completed' as const },
  { id: 2, accountId: 1, desc: 'Uplata plate - IT Solutions doo', amount: 185000.0, date: '01.03.2025', status: 'completed' as const },
  { id: 3, accountId: 1, desc: 'Maxi Market - kupovina', amount: -3240.5, date: '28.02.2025', status: 'completed' as const },
  { id: 4, accountId: 1, desc: 'EPS - račun za struju', amount: -4580.0, date: '25.02.2025', status: 'completed' as const },
  { id: 5, accountId: 1, desc: 'Povraćaj poreza', amount: 12500.0, date: '20.02.2025', status: 'completed' as const },
  { id: 6, accountId: 1, desc: 'Telenor - mesečni račun', amount: -2890.0, date: '18.02.2025', status: 'completed' as const },
  { id: 7, accountId: 2, desc: 'Freelance - Upwork', amount: 450.0, date: '02.03.2025', status: 'completed' as const },
  { id: 8, accountId: 2, desc: 'Amazon.de - porudžbina', amount: -89.99, date: '27.02.2025', status: 'completed' as const },
  { id: 9, accountId: 3, desc: 'Mesečna štednja - auto prenos', amount: 50000.0, date: '01.03.2025', status: 'completed' as const },
];

export const MOCK_VERIFICATIONS = [
  { id: 1, action: 'Plaćanje - EPS Beograd', amount: '4,580.00 RSD', date: '05.03.2025 14:32', status: 'confirmed' as const },
  { id: 2, action: 'Menjačnica - odlazna konverzija', amount: '500.00 EUR', date: '03.03.2025 09:15', status: 'confirmed' as const },
  { id: 3, action: 'Novo plaćanje - Telenor', amount: '2,890.00 RSD', date: '01.03.2025 18:44', status: 'rejected' as const },
  { id: 4, action: 'Plaćanje - Informatika AD', amount: '15,420.00 RSD', date: '28.02.2025 10:20', status: 'confirmed' as const },
  { id: 5, action: 'Menjačnica - dolazna konverzija', amount: '200.00 EUR', date: '25.02.2025 11:05', status: 'expired' as const },
];

export const MOCK_PENDING = {
  action: 'Novo plaćanje',
  recipient: 'Vodovod Beograd',
  amount: '1,250.00 RSD',
  account: '265-0000000011234-56',
};

export const MOCK_RECIPIENTS = [
  { id: 1, name: 'EPS Beograd', account: '333000112345678910' },
  { id: 2, name: 'Telenor Srbija', account: '333000112345678910' },
  { id: 3, name: 'Vodovod Beograd', account: '333000112345678910' },
  { id: 4, name: 'Ana Jovanović', account: '333000112345678910' },
];

export const MOCK_CARDS = [
  { id: 1, number: '4532 1234 5678 9012', name: 'Visa Debit', type: 'debit' as const, accountId: 1, expires: '06/27', limit: 500000, status: 'active' as const, currency: 'RSD' },
  { id: 2, number: '5412 7534 9821 0043', name: 'Mastercard EUR', type: 'debit' as const, accountId: 2, expires: '01/28', limit: 3000, status: 'active' as const, currency: 'EUR' },
  { id: 3, number: '4916 8801 2234 5567', name: 'Visa Gold', type: 'credit' as const, accountId: 1, expires: '12/26', limit: 200000, status: 'blocked' as const, currency: 'RSD' },
];

export const MOCK_EXCHANGE_RATES = [
  { from: 'EUR', to: 'RSD', buy: 116.50, sell: 118.20, mid: 117.35 },
  { from: 'USD', to: 'RSD', buy: 106.80, sell: 108.90, mid: 107.85 },
  { from: 'CHF', to: 'RSD', buy: 118.10, sell: 120.50, mid: 119.30 },
  { from: 'GBP', to: 'RSD', buy: 136.20, sell: 138.80, mid: 137.50 },
  { from: 'JPY', to: 'RSD', buy: 0.71, sell: 0.74, mid: 0.725 },
  { from: 'CAD', to: 'RSD', buy: 77.40, sell: 79.60, mid: 78.50 },
  { from: 'AUD', to: 'RSD', buy: 68.90, sell: 70.80, mid: 69.85 },
];

export const PAYMENT_CODES = [
  { code: '289', desc: 'Ostale usluge' },
  { code: '290', desc: 'Plate i naknade' },
  { code: '291', desc: 'Penzije' },
  { code: '220', desc: 'Zakupnina' },
  { code: '221', desc: 'Komunalne usluge' },
  { code: '253', desc: 'Kredit - rata' },
  { code: '254', desc: 'Kredit - kamata' },
  { code: '241', desc: 'Telefon i internet' },
  { code: '247', desc: 'Struja, gas, voda' },
  { code: '200', desc: 'Roba i usluge' },
];
