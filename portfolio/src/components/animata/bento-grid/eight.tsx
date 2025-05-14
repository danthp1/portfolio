import { Bot } from "lucide-react";
import React from "react";

// Lokale Placeholder-Komponenten im "Doodle Sketchbook"-Stil
const sketchBorder = "border-2 border-dashed border-black";
const sketchShadow = "shadow-[2px_2px_0px_black]";
const handwrittenFont = "font-handwritten italic";

const WideCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => (
  <div {...props} className={`${sketchBorder} ${sketchShadow} p-4 bg-white`}>[WideCard]</div>
);

const Counter: React.FC<{ targetValue: number; format: (val: number) => string }> = ({ targetValue, format }) => {
  const [value, setValue] = React.useState(0);
  React.useEffect(() => {
    const step = targetValue / 60;
    let current = 0;
    const id = setInterval(() => {
      current += step;
      setValue(Math.min(current, targetValue));
      if (current >= targetValue) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [targetValue]);
  return <span className={handwrittenFont}>{format(value)}</span>;
};

const Ticker: React.FC<{ value: string | number }> = ({ value }) => (
  <span className={handwrittenFont}>{value}</span>
);

const TypingText: React.FC<{ text: string; waitTime?: number; alwaysVisibleCount?: number }> = ({ text, waitTime = 0, alwaysVisibleCount = 0 }) => {
  const [displayed, setDisplayed] = React.useState(text.slice(0, alwaysVisibleCount));
  React.useEffect(() => {
    let idx = alwaysVisibleCount;
    const to = setTimeout(() => {
      const int = setInterval(() => {
        setDisplayed((prev) => prev + text[idx]);
        idx++;
        if (idx >= text.length) clearInterval(int);
      }, 100);
    }, waitTime);
    return () => clearTimeout(to);
  }, [text, waitTime, alwaysVisibleCount]);
  return <span className={handwrittenFont}>{displayed}</span>;
};

const BoldCopy: React.FC<{ text?: string; className?: string }> = ({ text = "DOODLE", className }) => {
  return (
    <div className={`relative flex items-center justify-center p-2 ${className}`}>
      <div className="text-8xl font-black uppercase text-gray-200 absolute -rotate-3">{text}</div>
      <div className="text-2xl font-black uppercase relative text-black">{text}</div>
    </div>
  );
};

const BentoCard: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className={`relative h-full w-full overflow-hidden rounded-lg p-4 bg-cream-light ${sketchBorder} ${sketchShadow}`}>
    {children}
  </div>
);

export default function EightSketchbook() {
  return (
    <div className="p-6 bg-paper-bg min-h-screen">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* Feature One: Sternebewertung */}
        <BentoCard>
          <div className="text-lg font-bold">Highly rated</div>
          <div className="mt-auto flex items-baseline justify-end">
            {/* Beispiel: <Counter targetValue={199} format={(val) => `${Math.round(val)}%`} /> */}
          </div>
        </BentoCard>

        {/* Feature Two: Studenten-Count + Avatare */}
        <BentoCard>
          <div className="text-xl font-semibold mb-2">Students</div>
          {/* Beispiel: <Ticker value={1200} /> */}
        </BentoCard>

        {/* Feature Drei: Integrierte AI */}
        <BentoCard>
          <Bot className="w-8 h-8" />
          <div className="mt-2 text-sm font-medium">What is 4×4?</div>
        </BentoCard>

        {/* Feature Vier: Fortschrittsbericht */}
        <BentoCard>
          {/* Beispiel: <TypingText text="Loading progress..." waitTime={500} alwaysVisibleCount={8} /> */}
        </BentoCard>

        {/* Feature Fünf: Großes Doodle-Logo */}
        <BentoCard>
          {/* Beispiel: <BoldCopy text="DOODLE" /> */}
        </BentoCard>

        {/* Feature Sechs: Balkendiagramm */}
        <BentoCard>
          {/* Hier könnte ein Chart-Komponente stehen */}
        </BentoCard>

        {/* Feature Sieben: Tags */}
        <BentoCard>
          {['Javascript', 'ReactJS', 'NextJS'].map((tech, i) => (
            <div
              key={i}
              className={`my-1 px-2 py-1 rounded-full bg-white inline-block ${sketchBorder} ${handwrittenFont}`}
            >
              {tech}
            </div>
          ))}
        </BentoCard>

        {/* Feature Acht: Tägliche Erinnerungen */}
        <BentoCard>
          <WideCard />
          <div className="mt-3">
            <div className="text-lg font-black">Daily reminders</div>
            <p className={handwrittenFont}>
              Our daily reminder helps you stay focused on your goals.
            </p>
          </div>
        </BentoCard>

      </div>
    </div>
  );
}
