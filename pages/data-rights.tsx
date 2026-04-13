import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function DataRightsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return null;
}
