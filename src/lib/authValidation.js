import { isStudentEmail } from './auth';

export function validateLogin({ email, password }) {
  const errors = {};
  if (!isStudentEmail(email)) errors.email = 'Enter your @ms.bulsu.edu.ph student email.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export function validateSignup(form) {
  const errors = validateLogin(form);
  if (form.name.trim().length < 2) errors.name = 'Enter your full name (at least 2 characters).';
  if (form.course.trim().length < 2)
    errors.course = 'Enter your course, year and section (at least 2 characters).';
  if (form.password.length < 8) errors.password = 'Use at least 8 characters for your password.';
  if (!form.confirm) errors.confirm = 'Confirm your password.';
  else if (form.password !== form.confirm) errors.confirm = 'Passwords do not match. Try again.';
  if (!form.accepted) errors.accepted = 'Agree to the community rules to create your account.';
  return errors;
}
