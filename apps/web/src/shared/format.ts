export function formatPKR(value: string | number): string {
    return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
        maximumFractionDigits: 2,
    }).format(Number(value));
}

export function formatLocalDate(value: string): string {
    return new Intl.DateTimeFormat("en-PK", {
        dateStyle: "medium",
        timeZone: "Asia/Karachi",
    }).format(new Date(value));
}

export function formatLocalDateTime(value: string): string {
    return new Intl.DateTimeFormat("en-PK", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Karachi",
    }).format(new Date(value));
}