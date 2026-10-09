import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import ImagePlaceholder from '../components/ui/ImagePlaceholder';
const steps = [
  ['Verify with your BulSU email', 'Confirm your student email, then add a clear profile photo for admin review.'],
  ['Post or request an item', 'List what you can lend or rent, or browse what others offer.'],
  ['Meet up and return it', 'Hand over in person, record the condition, and return on time.']
];
const trust = [
  ['Verified students only', 'Every member signs up with a BulSU email.'],
  ['Condition records', 'Notes and photos at handover and return.'],
  ['Trust record', 'On-time returns build a visible reputation.']
];
export default function Landing() {
  return <><section className="container hero"><div className="hero__copy"><h1>Borrow what you need.<br />Lend what you don’t.</h1><p className="hero__description">A shelf for BulSU students to lend, rent, and borrow calculators, drafting tools, and lab items, with records everyone can trust.</p><div className="actions"><Button to="/signup">Sign up with BulSU email</Button><Button variant="secondary" to="/shelf">Browse the shelf</Button></div><p className="small muted">Only @ms.bulsu.edu.ph emails can sign up.</p></div><ImagePlaceholder className="hero__image" label="Hero illustration: a handover at the library" /></section>
  <section className="container how"><h2>How it works</h2><ol className="step-grid">{steps.map(([title, text], i) => <li className="step-card" key={title}><div className="step-card__heading"><span className="step-number">{i + 1}</span><h3>{title}</h3></div><p>{text}</p></li>)}</ol></section>
  <section className="trust-section"><div className="container"><h2>Why students can trust it</h2><div className="trust-grid">{trust.map(([title, text]) => <div className="trust-block" key={title}><span className="trust-icon"><Icon name="check" /></span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div></div></section>
  </>;
}

