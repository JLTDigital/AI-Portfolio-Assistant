const LINKS = [
  { label: "PORTFOLIO", href: process.env.NEXT_PUBLIC_PORTFOLIO_URL },
  { label: "LINKEDIN", href: process.env.NEXT_PUBLIC_LINKEDIN_URL },
];

export const DETAILS =
  "You can find Jonathan's full details on his portfolio or LinkedIn.";

export const CONTROL =
  "border border-amber px-4 py-1 text-base font-semibold text-amber hover:bg-amber hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function ContactLinks() {
  return LINKS.map(
    ({ label, href }) =>
      href && (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={CONTROL}
        >
          {label}
        </a>
      ),
  );
}
