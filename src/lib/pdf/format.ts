export function formatDate(date: Date): string {
  return date.toLocaleDateString("hr-HR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// hr-HR: točka kao tisućice, zarez kao decimalni separator (npr. "10.100,00 €") -
// matches stvarni primjerak MARŽNI-RAČUN.pdf.
export function formatEur(n: number): string {
  return `${new Intl.NumberFormat("hr-HR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} €`;
}
