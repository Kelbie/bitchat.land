import React from 'react';
import { createRoot } from 'react-dom/client';
import ParentSize from '@visx/responsive/lib/components/ParentSize';

import Example from './App';
import './index.css';

const root = createRoot(document.getElementById('root')!);

root.render(
  <ParentSize>{({ width, height }) => <Example width={width} height={height} />}</ParentSize>,
);
