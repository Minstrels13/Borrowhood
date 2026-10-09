import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import EditProfileModal from '../components/modals/EditProfileModal';
import { useState } from 'react';
export default function ShelfBoundary() {
  const { user, isVerified, isAdmin } = useAuth(); const [editing, setEditing] = useState(false);
  return <section className="container page-section"><h1>The shelf</h1><p>Listing browsing will be added in Phase 3.</p>{isVerified ? <><p>Your account is verified.</p><Button variant="secondary" onClick={() => setEditing(true)}>Edit profile</Button><EditProfileModal open={editing} onClose={() => setEditing(false)} /></> : user && !isAdmin ? <Button to="/pending">Check verification status</Button> : !user ? <Button to="/signup">Sign up with BulSU email</Button> : <Button to="/admin/verification">Open verification queue</Button>}</section>;
}
