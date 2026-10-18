import Icon from './Icon';

// These flags describe presentation only; account eligibility stays in AuthContext.
export default function VerificationStepper({ confirmed, hasPhoto, rejected, verified = false, label: progressLabel = 'Verification progress' }) {
  const current = verified ? 3 : !confirmed ? 0 : rejected || !hasPhoto ? 1 : 2;
  return (
    <ol className="verification-steps" aria-label={progressLabel}>
      {['Email', 'Photo', 'Admin review', 'Verified'].map((label, index) => {
        const complete = verified || index < current;
        const active = index === current;
        return (
          <li
            key={label}
            className={complete ? 'is-complete' : active ? 'is-current' : ''}
            aria-current={active ? 'step' : undefined}
          >
            <span className="verification-step__marker" aria-hidden="true">
              {complete ? <Icon name="check" /> : active ? <span className="verification-step__dot" /> : index + 1}
            </span>
            <span className="verification-step__label">
              {label}
              <span className="sr-only">{complete ? ', complete' : active ? ', current step' : ', not started'}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
