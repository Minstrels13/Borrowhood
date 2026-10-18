import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Logo from '../components/ui/Logo';
import LandingArtwork from '../components/landing/LandingArtwork';
import CommunityRulesModal from '../components/modals/CommunityRulesModal';
import { brand } from '../config/brand';

const categories = ['Calculators', 'Drafting tools', 'Lab items', 'Books and modules', 'Uniform and attire'];
const steps = [
  ['01', 'lock', 'Verify with your BulSU email', 'Confirm your student email, then add a clear profile photo for admin review.'],
  ['02', 'post-tab', 'Post or request an item', 'List what you can lend or rent, or pick dates on an item you need.'],
  ['03', 'check', 'Meet up and return it', 'Hand over in person, record the condition, and return on time to build trust.'],
];
const features = [
  ['calendar', 'Availability calendar', 'See which days are free. Approved and handed-over requests block their dates.'],
  ['condition', 'Condition records', 'Notes and photos at handover and return, side by side.'],
  ['trust', 'Trust record', 'Built from on-time returns and item condition.'],
  ['comments', 'Questions on every listing', 'Ask the owner in public, so everyone sees the answer.'],
  ['verified', 'Verified students only', 'Everyone signs up with a BulSU email and a real profile photo.'],
];
const accountability = [
  ['Every member is verified', 'Only confirmed BulSU students can post or request.'],
  ['Every handover is documented', 'Condition notes and photos protect both sides.'],
  ['Every return counts', 'On-time returns grow your trust record.'],
];
const faqs = [
  ['Who can join Borrowhood?', 'Any BulSU student with an @ms.bulsu.edu.ph email. You confirm your email, add a profile photo, and an admin approves your account.'],
  ['Does Borrowhood handle payments?', 'No. Borrowhood doesn’t process or track payments. A price label on a listing is only a description, and any payment is agreed and settled in person.'],
  ['How do I know who I’m meeting?', 'Every student adds a profile photo and is approved by an admin before they can post or request. You can also see their trust badge and condition history before you agree to meet.'],
  ['How long can I borrow an item?', 'Each owner sets a maximum number of days for their listing. You pick your dates on the item’s calendar, up to that limit.'],
];

export default function Landing() {
  const [rulesOpen, setRulesOpen] = useState(false);
  return (
    <div className="landing-page">
      <section className="container landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero__copy">
          <p className="landing-audience"><span aria-hidden="true" />Made for BulSU students</p>
          <h1 id="landing-title"><span>Borrow what <br className="landing-hero__break" />you need.</span><span>Lend what you don’t.</span></h1>
          <p className="landing-hero__description">The campus shelf where BulSU students lend, rent, and borrow calculators, drafting tools, lab gear, and more, with clear records on both sides.</p>
          <div className="landing-actions">
            <Button to="/signup" size="large">Sign up with your BulSU email</Button>
            <Button variant="secondary" to="/shelf" size="large">Browse the shelf</Button>
          </div>
          <ul className="landing-assurances">
            {['BulSU email only', 'Handovers in person', 'No payments in the app'].map(text => <li key={text}><Icon name="check" />{text}</li>)}
          </ul>
        </div>
        <LandingArtwork variant="hero" />
      </section>
      <section className="container landing-categories" aria-label="Item categories">
        <p className="landing-eyebrow">Borrow almost anything for class</p>
        <ul>{categories.map(category => <li key={category}>{category}</li>)}</ul>
      </section>
      <section id="how-it-works" className="container landing-section" aria-labelledby="how-title" tabIndex={-1}>
        <div className="landing-section-heading">
          <p className="landing-eyebrow">How it works</p>
          <h2 id="how-title">Three steps from need to handover</h2>
          <p>No group chats, no guessing who has what.</p>
        </div>
        <ol className="landing-steps">
          {steps.map(([number, icon, title, text]) => (
            <li className="landing-step" key={number}>
              <span className="landing-step__icon"><Icon name={icon} /></span>
              <span className="landing-step__number" aria-hidden="true">{number}</span>
              <h3>{title}</h3><p>{text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section id="features" className="container landing-section" aria-labelledby="features-title" tabIndex={-1}>
        <div className="landing-section-heading">
          <p className="landing-eyebrow">Features</p>
          <h2 id="features-title">Everything you need to lend with confidence</h2>
        </div>
        <div className="landing-features">
          {features.map(([variant, title, text]) => <article className={`landing-feature landing-feature--${variant}`} key={variant}>
            <div><h3>{title}</h3><p>{text}</p></div>
            <LandingArtwork variant={variant} />
          </article>)}
        </div>
      </section>
      <section className="landing-accountability" aria-labelledby="accountability-title">
        <div className="container landing-accountability__inner">
          <div>
            <p className="landing-eyebrow">Why it works</p>
            <h2 id="accountability-title">A campus shelf built on accountability.</h2>
            <p className="landing-accountability__description">When everyone is verified and every handover is documented, borrowing from a classmate feels safe.</p>
          </div>
          <ul>{accountability.map(([title, text]) => <li key={title}><span><Icon name="check" /></span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ul>
        </div>
      </section>
      <section id="faq" className="container landing-section landing-faq" aria-labelledby="faq-title" tabIndex={-1}>
        <div className="landing-section-heading"><p className="landing-eyebrow">FAQ</p><h2 id="faq-title">Questions, answered</h2></div>
        <div className="landing-faq__list">
          {faqs.map(([question, answer], index) => <details key={question} open={index === 0 ? true : undefined}>
            <summary>{question}<Icon name="chevron-down" /></summary><p>{answer}</p>
          </details>)}
        </div>
      </section>
      <section className="container landing-cta" aria-labelledby="cta-title">
        <h2 id="cta-title">Ready to borrow smarter?</h2><p>Join your classmates on {brand.name}.</p>
        <div className="landing-actions"><Button to="/signup" size="large">Sign up with BulSU email</Button><Button to="/login" variant="secondary" size="large">Log in</Button></div>
      </section>
      <footer className="landing-footer">
        <div className="container">
          <div className="landing-footer__main">
            <div className="landing-footer__brand"><Link to="/" className="brand-link" aria-label={`${brand.name} home`}><Logo decorative /></Link><p>A campus shelf for BulSU students to lend, rent, and borrow school items.</p></div>
            <nav aria-label="Product"><h3>Product</h3><Link to="/shelf">Browse the shelf</Link><a href="#how-it-works">How it works</a><a className="landing-footer__desktop" href="#features">Features</a></nav>
            <nav aria-label="Account and community"><h3>Account</h3><Link to="/login">Log in</Link><Link className="landing-footer__desktop" to="/signup">Sign up</Link><button type="button" onClick={() => setRulesOpen(true)}>Community rules</button></nav>
          </div>
        </div>
      </footer>
      <CommunityRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
