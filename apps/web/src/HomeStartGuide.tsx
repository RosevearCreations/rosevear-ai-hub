import { buildHomeStartGuide, type HomeGuideInput } from "./homeStartGuideModel";
import "./homeStartGuide.css";

export function HomeStartGuide({ status, allowed, onNavigate }: {
  status: HomeGuideInput;
  allowed: readonly string[];
  onNavigate: (section: string) => void;
}) {
  const cards = buildHomeStartGuide(status, allowed);
  return <section className="home-start-guide" aria-labelledby="home-start-title">
    <header>
      <div>
        <p className="eyebrow">Guided daily start</p>
        <h2 id="home-start-title">What should we do next?</h2>
        <p>These are local status observations and optional screen shortcuts, not automatic repairs or device controls.</p>
      </div>
    </header>
    <div className="home-start-cards">
      {cards.map(card => <article key={card.key} className={`home-start-card home-start-${card.state}`}>
        <span className="home-start-state">{card.state === "checking" ? "Checking" : card.state === "attention" ? "Needs attention" : "Available route"}</span>
        <h3>{card.title}</h3>
        <p>{card.detail}</p>
        {card.destination && card.actionLabel
          ? <button type="button" onClick={() => onNavigate(card.destination!)}>{card.actionLabel}</button>
          : <small>No action is offered until this route is available to the account.</small>}
      </article>)}
    </div>
  </section>;
}
