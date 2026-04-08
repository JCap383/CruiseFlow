import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DailySchedule } from '@/pages/DailySchedule';
import { FamilyDashboard } from '@/pages/FamilyDashboard';
import { Settings } from '@/pages/Settings';
import { AddEditEvent } from '@/pages/AddEditEvent';
import { EventDetail } from '@/pages/EventDetail';
import { Onboarding } from '@/pages/Onboarding';
import { Scanner } from '@/pages/Scanner';
import { Concierge } from '@/pages/Concierge';
import { Memories } from '@/pages/Memories';

export const router = createBrowserRouter([
  {
    path: '/onboarding',
    element: <Onboarding />,
  },
  {
    path: '/concierge',
    element: <Concierge />,
  },
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <DailySchedule /> },
      { path: '/scanner', element: <Scanner /> },
      { path: '/memories', element: <Memories /> },
      { path: '/family', element: <FamilyDashboard /> },
      { path: '/settings', element: <Settings /> },
      { path: '/event/new', element: <AddEditEvent /> },
      { path: '/event/:id', element: <EventDetail /> },
      { path: '/event/:id/edit', element: <AddEditEvent /> },
    ],
  },
]);
