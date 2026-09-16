import { redirect } from 'next/navigation';

export default function FacultyLoginPage() {
  redirect('/login?role=faculty');
}
