'use client';

import { useCallback, useState } from 'react';

export function useAdminRetry() {
  const [retryKey, setRetryKey] = useState(0);
  const retry = useCallback(() => setRetryKey((key) => key + 1), []);

  return { retryKey, retry };
}
