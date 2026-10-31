const QUESTIONS = [
  "What Shopify work has he done?",
  "What's his tech stack?",
  "What projects has he built?",
  "What roles is he looking for?",
  "When can he start?",
];

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

/** Starter chips that send a common recruiter question. */
export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  return (
    <ul
      aria-label="Suggested questions"
      className="flex shrink-0 gap-2 overflow-x-auto p-1 [scrollbar-width:thin] sm:flex-wrap sm:overflow-visible sm:p-0"
    >
      {QUESTIONS.map((question) => (
        <li key={question} className="shrink-0">
          <button
            type="button"
            onClick={() => onSelect(question)}
            // Browsers leave a partly visible chip where it is on focus.
            onFocus={(event) =>
              event.currentTarget.scrollIntoView({
                block: "nearest",
                inline: "nearest",
              })
            }
            className="min-h-11 scroll-mx-1 border border-amber px-2 text-sm font-semibold whitespace-nowrap text-amber sm:px-3 sm:text-base hover:bg-amber hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {question}
          </button>
        </li>
      ))}
    </ul>
  );
}
