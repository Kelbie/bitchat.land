import { Cable } from 'lucide-react';
import { TorMode, useTorStatus } from '../../services/tor';

interface Props {
  className?: string;
}

export function TorStatusIcon({ className }: Props) {
  const status = useTorStatus();
  if (status.mode === TorMode.OFF) return null;

  let color = 'red';
  if (status.state !== 'running' || status.bootstrap < 100) {
    color = '#FF9500';
  } else {
    color = '#00C851';
  }

  return <Cable className={className} size={16} color={color} />;
}
