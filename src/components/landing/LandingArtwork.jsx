import Avatar from '../ui/Avatar';
import Chip from '../ui/Chip';
import TrustBadge from '../ui/TrustBadge';
import Icon from '../ui/Icon';

// Static illustration only. Never connect these motifs to listings, dates or profiles.
function NameBar() {
  return <span className="landing-art__name-bar" />;
}

function Calculator() {
  return <div className="landing-calculator">
    <span className="landing-calculator__display" />
    <div className="landing-calculator__keys">
      {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
    </div>
  </div>;
}

// A decorative calendar, deliberately independent of the interactive booking Calendar.
// Numbers have no month/year or real request behind them; the pattern echoes S01.
function CalendarIllustration() {
  return <div className="landing-calendar">
    <NameBar />
    <div className="landing-calendar__weekdays">
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={index}>{day}</span>)}
    </div>
    <div className="landing-calendar__dates">
      {Array.from({ length: 4 }, (_, index) => <span key={`blank-${index}`} />)}
      {Array.from({ length: 31 }, (_, index) => {
        const day = index + 1;
        const state = day >= 20 && day <= 22 ? 'selected' : day >= 14 && day <= 17 ? 'blocked' : day <= 6 ? 'muted' : 'free';
        return <span className={`landing-calendar__day landing-calendar__day--${state}`} key={day}>{day}</span>;
      })}
    </div>
  </div>;
}

function HeroIllustration() {
  return <>
    <div className="landing-art__listing">
      <div className="landing-art__image"><Calculator /><Chip label="Available" tone="info" /></div>
      <div className="landing-art__listing-body">
        <span className="landing-art__title-bar" />
        <span className="landing-art__category">Calculators</span>
        <Chip label="Free" tone="info" className="landing-art__free" />
        <div className="landing-art__owner"><Avatar size="sm" decorative /><div><NameBar /><TrustBadge level="trusted" /></div></div>
      </div>
    </div>
    <div className="landing-art__approval"><span className="landing-art__check"><Icon name="check" /></span><div><strong>Request approved</strong><NameBar /></div></div>
    <div className="landing-art__calendar"><CalendarIllustration /></div>
    <div className="landing-art__profile"><Avatar decorative /><div><NameBar /><TrustBadge level="trusted" /></div></div>
  </>;
}

function ConditionIllustration() {
  return <div className="landing-art__records">
    {['At handover', 'At return'].map(label => <div className="landing-art__record" key={label}>
      <strong>{label}</strong><Chip label="Good" tone="info" />
      <div className="landing-art__note-bars"><i /><i /></div>
      <div className="landing-art__photo"><Icon name="landscape" /></div>
    </div>)}
  </div>;
}

function TrustIllustration() {
  return <><TrustBadge level="trusted" /><span className="landing-art__ring" /></>;
}

function CommentsIllustration() {
  return <div className="landing-art__bubbles">
    <div className="landing-art__question"><Avatar size="sm" decorative /><div><strong>Is it still available?</strong><NameBar /></div></div>
    <div className="landing-art__reply"><strong>Yes, it is open this week.</strong><NameBar /></div>
  </div>;
}

function VerifiedIllustration() {
  return <div className="landing-art__members">
    <div className="landing-art__avatars">{Array.from({ length: 5 }, (_, index) => <Avatar key={index} decorative />)}</div>
    <div className="landing-art__email"><span className="landing-art__check"><Icon name="check" /></span><span>ms.bulsu.edu.ph only</span></div>
  </div>;
}

// All text/shapes here are decorative. Real headings/descriptions live in Landing.
export default function LandingArtwork({ variant }) {
  const illustrations = {
    hero: HeroIllustration,
    calendar: CalendarIllustration,
    condition: ConditionIllustration,
    trust: TrustIllustration,
    comments: CommentsIllustration,
    verified: VerifiedIllustration,
  };
  const Illustration = illustrations[variant];
  if (!Illustration) return null;
  return <div className={`landing-art landing-art--${variant}`} aria-hidden="true"><Illustration /></div>;
}
