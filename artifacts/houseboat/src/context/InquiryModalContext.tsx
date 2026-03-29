import { createContext, useContext, useState, ReactNode } from "react";

export interface InquiryPrefill {
  packageService?: string;
  checkIn?: string;
  adults?: string;
  kids?: string;
}

interface InquiryModalContextValue {
  isOpen: boolean;
  prefill: InquiryPrefill | null;
  open: (prefill?: InquiryPrefill) => void;
  close: () => void;
}

const InquiryModalContext = createContext<InquiryModalContextValue | null>(null);

export function InquiryModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState<InquiryPrefill | null>(null);

  const open = (data?: InquiryPrefill) => {
    setPrefill(data ?? null);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setPrefill(null);
  };

  return (
    <InquiryModalContext.Provider value={{ isOpen, prefill, open, close }}>
      {children}
    </InquiryModalContext.Provider>
  );
}

export function useInquiryModal() {
  const ctx = useContext(InquiryModalContext);
  if (!ctx) throw new Error("useInquiryModal must be used within InquiryModalProvider");
  return ctx;
}
