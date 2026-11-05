// "Is this address inside that block?" — for the admin's own-network warning
// only. The real decision is made by Postgres (network >>= ip); this just has
// to agree with it for the warning to be honest.

function ipv4ToBigInt(ip: string): bigint | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0n;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p) || Number(p) > 255) return null;
    n = (n << 8n) + BigInt(Number(p));
  }
  return n;
}

function ipv6ToBigInt(ip: string): bigint | null {
  const [head, tail, ...rest] = ip.split('::');
  if (rest.length) return null;
  const left = head ? head.split(':') : [];
  const right = tail !== undefined ? (tail ? tail.split(':') : []) : null;
  // "::" stands for at least one zero group; more than 7 explicit groups
  // around it is malformed (and Array() of a negative length would throw).
  if (right !== null && left.length + right.length > 7) return null;
  const groups = right === null ? left : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
  if (groups.length !== 8) return null;
  let n = 0n;
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(g)) return null;
    n = (n << 16n) + BigInt(parseInt(g, 16));
  }
  return n;
}

function parse(ip: string): { value: bigint; bits: number } | null {
  const v4 = ipv4ToBigInt(ip);
  if (v4 !== null) return { value: v4, bits: 32 };
  const v6 = ipv6ToBigInt(ip);
  if (v6 !== null) return { value: v6, bits: 128 };
  return null;
}

export function ipInNetwork(ip: string, network: string): boolean {
  const [base, lenText] = network.split('/');
  const addr = parse(ip.trim());
  const net = parse(base.trim());
  if (!addr || !net || addr.bits !== net.bits) return false;
  const len = lenText === undefined ? net.bits : Number(lenText);
  if (!Number.isInteger(len) || len < 0 || len > net.bits) return false;
  const shift = BigInt(net.bits - len);
  return addr.value >> shift === net.value >> shift;
}
