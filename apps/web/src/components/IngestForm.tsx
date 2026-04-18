import { type FormEvent, type KeyboardEvent, useState } from "react";

interface IngestFormProps {
  onCreate: (name: string, urls: string[], hypotheses: string[]) => void | Promise<void>;
  disabled?: boolean;
}

export function IngestForm({ onCreate, disabled = false }: IngestFormProps) {
  const [name, setName] = useState("");
  const [urlsText, setUrlsText] = useState("");
  const [hypothesisInput, setHypothesisInput] = useState("");
  const [hypotheses, setHypotheses] = useState<string[]>([
    "Users will respond most strongly to camera proof over AI framing.",
  ]);
  const [error, setError] = useState<string | null>(null);

  const addHypothesis = () => {
    const value = hypothesisInput.trim();
    if (!value || hypotheses.includes(value)) {
      setHypothesisInput("");
      return;
    }
    setHypotheses((current) => [...current, value]);
    setHypothesisInput("");
  };

  const handleHypothesisKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addHypothesis();
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Product name is required");
      return;
    }

    setError(null);
    const urls = urlsText
      .split("\n")
      .map((url) => url.trim())
      .filter(Boolean);

    await onCreate(trimmedName, urls, hypotheses);
  };

  return (
    <form
      className="animate-slide-up rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-200/80 backdrop-blur md:p-8"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-6">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-sky-600">
            Start a search
          </p>
          <h2 className="font-display text-2xl font-medium text-slate-900">
            New product
          </h2>
          <p className="text-sm text-slate-500">
            Keep it short. You can always search again from the results screen.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="product-name">
            Product name
          </label>
          <input
            id="product-name"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white"
            disabled={disabled}
            onChange={(event) => setName(event.target.value)}
            placeholder="iPhone 18"
            type="text"
            value={name}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="seed-urls">
            Seed URLs
          </label>
          <textarea
            id="seed-urls"
            className="min-h-32 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white"
            disabled={disabled}
            onChange={(event) => setUrlsText(event.target.value)}
            placeholder={"https://example.com/review\nhttps://reddit.com/r/apple"}
            value={urlsText}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="hypothesis-input">
            Hypotheses
          </label>
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap gap-2">
              {hypotheses.map((hypothesis) => (
                <span
                  key={hypothesis}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-sm text-sky-700"
                >
                  {hypothesis}
                  <button
                    className="text-sky-500 transition hover:text-sky-700"
                    disabled={disabled}
                    onClick={() =>
                      setHypotheses((current) =>
                        current.filter((item) => item !== hypothesis),
                      )
                    }
                    type="button"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <input
                id="hypothesis-input"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400"
                disabled={disabled}
                onChange={(event) => setHypothesisInput(event.target.value)}
                onKeyDown={handleHypothesisKeyDown}
                placeholder="Type a hypothesis and press Enter"
                type="text"
                value={hypothesisInput}
              />
              <button
                className="rounded-xl bg-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled}
                onClick={addHypothesis}
                type="button"
              >
                Add hypothesis
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <button
          className="rounded-xl bg-sky-500 px-6 py-3 font-medium text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          disabled={disabled || !name.trim()}
          type="submit"
        >
          Search product
        </button>
      </div>
    </form>
  );
}
