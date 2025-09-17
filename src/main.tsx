import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import ParentSize from '@visx/responsive/lib/components/ParentSize';

import Example from './App';
import './index.css';

const root = createRoot(document.getElementById('root')!);

root.render(
  <BrowserRouter>
    <ParentSize>{({ width, height }) => <Example width={width} height={height} />}</ParentSize>
  </BrowserRouter>,
);
