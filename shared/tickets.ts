export interface Product { id: string; price: number; trips?: number; validDays?: number; main?: boolean }
// Demo prices in DA; not official SNTF fares.
export const PRODUCTS: Product[] = [
  { id: 'B1', price: 50, trips: 1, validDays: 1 },
  { id: 'C10', price: 400, trips: 10, validDays: 365 },
  { id: 'ABO', price: 2500, validDays: 31 },
  { id: 'ETU', price: 1200, validDays: 31 },
  { id: 'GL', price: 1500, trips: 1, validDays: 7, main: true },
];
