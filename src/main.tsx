import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import ParentSize from '@visx/responsive/lib/components/ParentSize';

import Example from './App';
import { RadioPlayerProvider } from '@/components/features/radio';
import { AppLoader } from '@/components/layout';
import './index.css';

const root = createRoot(document.getElementById('root')!);

root.render(
  <BrowserRouter>
    <AppLoader theme="matrix" minLoadingTime={2000}>
      <RadioPlayerProvider>
        <ParentSize>
          {({ width, height }) => <Example width={width} height={height} />}
        </ParentSize>
      </RadioPlayerProvider>
    </AppLoader>
  </BrowserRouter>,
);
