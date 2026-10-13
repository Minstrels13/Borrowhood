import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <section className="container empty-state">
      <h1>Page not found</h1>
      <p>This page isn’t available. Head back home to continue.</p>
      <Button to="/">Back home</Button>
    </section>
  );
}
