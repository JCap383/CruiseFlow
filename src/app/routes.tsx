import { createBrowserRouter, createHashRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { AppShell } from '@/components/layout/AppShell';
import { DailySchedule } from '@/pages/DailySchedule';
import { FamilyDashboard } from '@/pages/FamilyDashboard';
import { Settings } from '@/pages/Settings';
import { AddEditEvent } from '@/pages/AddEditEvent';
import { EventDetail } from '@/pages/EventDetail';
import { Onboarding } from '@/pages/Onboarding';
import { Concierge } from '@/pages/Concierge';
import { Memories } from '@/pages/Memories';
import { ShipInfo } from '@/pages/ShipInfo';
import { CruiseRecap } from '@/pages/CruiseRecap';

const routes = [
  {
    path: '/onboarding',
    element: <Onboarding />,
  },
  {
    path: '/concierge',
    element: <Concierge />,
  },
  {
    // #96: Full-screen story player — intentionally outside the AppShell
    // so the bottom nav bar doesn't poke into the immersive experience.
    path: '/cruise/:id/recap',
    element: <CruiseRecap />,
  },
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <DailySchedule /> },
      { path: '/memories', element: <Memories /> },
      { path: '/ship', element: <ShipInfo /> },
      { path: '/family', element: <FamilyDashboard /> },
      { path: '/settings', element: <Settings /> },
      { path: '/event/new', element: <AddEditEvent /> },
      { path: '/event/:id', element: <EventDetail /> },
      { path: '/event/:id/edit', element: <AddEditEvent /> },
    ],
  },
];

// Use hash router in native Capacitor shell (WebView has no server for
// history API fallback). Use browser router on the web.
export const router = Capacitor.isNativePlatform()
  ? createHashRouter(routes)
  : createBrowserRouter(routes);
