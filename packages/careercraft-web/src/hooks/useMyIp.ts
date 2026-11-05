// The visitor's IP as the server saw it, filled in by AccessGate's check.
// The admin screens use it to warn before an admin blocks the network they're
// on. null until the first check has answered.

import { useEffect, useState } from 'react';

let current: string | null = null;
const listeners = new Set<(ip: string | null) => void>();

export function setMyIp(ip: string | null): void {
  if (!ip || ip === current) return;
  current = ip;
  listeners.forEach((l) => l(ip));
}

export function useMyIp(): string | null {
  const [ip, setIp] = useState(current);
  useEffect(() => {
    listeners.add(setIp);
    setIp(current);
    return () => {
      listeners.delete(setIp);
    };
  }, []);
  return ip;
}
