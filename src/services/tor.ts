import { useEffect, useState } from 'react';

export enum TorMode {
  OFF = 'off',
  ON = 'on',
  ISOLATION = 'isolation',
}

export enum TorState {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
}

export interface TorStatus {
  mode: TorMode;
  state: TorState;
  bootstrap: number;
  lastLog: string;
}

type Listener = (status: TorStatus) => void;

class TorManagerClass {
  private status: TorStatus = {
    mode: TorMode.OFF,
    state: TorState.STOPPED,
    bootstrap: 0,
    lastLog: '',
  };
  private listeners: Set<Listener> = new Set();

  setMode(mode: TorMode) {
    this.status = { ...this.status, mode };
    if (mode === TorMode.OFF) {
      this.status.state = TorState.STOPPED;
      this.status.bootstrap = 0;
      this.notify();
      return;
    }

    this.status.state = TorState.STARTING;
    this.status.bootstrap = 0;
    this.notify();

    // Simulate async bootstrap completion
    setTimeout(() => {
      this.status.state = TorState.RUNNING;
      this.status.bootstrap = 100;
      this.notify();
    }, 1000);
  }

  getStatus(): TorStatus {
    return this.status;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const l of this.listeners) l(this.status);
  }
}

export const TorManager = new TorManagerClass();

export function useTorStatus() {
  const [status, setStatus] = useState<TorStatus>(TorManager.getStatus());
  useEffect(() => TorManager.subscribe(setStatus), []);
  return status;
}

