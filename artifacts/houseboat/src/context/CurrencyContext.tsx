import { createContext, useContext, useState, useCallback, useEffect } from "react";

export type Currency = "INR" | "GBP" | "USD";

const RATES: Record<Currency, number> = {
  INR: 1,
  GBP: 0.0091,
  USD: 0.012,
};

const LOCALES: Record<Currency, string> = {
  INR: "en-IN",
  GBP: "en-GB",
  USD: "en-US",
};

const SYMBOLS: Record<Currency, string> = {
  INR: "₹",
  GBP: "£",
  USD: "$",
};

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  symbol: string;
  fmt: (amountInINR: string | number | null | undefined) => string | null;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "INR",
  setCurrency: () => {},
  symbol: "₹",
  fmt: () => null,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    try {
      const saved = localStorage.getItem("site_currency") as Currency;
      if (saved && ["INR", "GBP", "USD"].includes(saved)) return saved;
    } catch {}
    return "INR";
  });

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem("site_currency", c); } catch {}
  }, []);

  const fmt = useCallback(
    (amountInINR: string | number | null | undefined): string | null => {
      const num = typeof amountInINR === "string" ? parseFloat(amountInINR) : amountInINR;
      if (num == null || isNaN(num as number)) return null;
      const converted = (num as number) * RATES[currency];
      return new Intl.NumberFormat(LOCALES[currency], {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(converted);
    },
    [currency]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, symbol: SYMBOLS[currency], fmt }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
