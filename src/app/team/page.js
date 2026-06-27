'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/ceo?tab=team');
  }, [router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--text-muted)', fontSize: '16px' }}>
      Redirecting to CEO Console...
    </div>
  );
}
