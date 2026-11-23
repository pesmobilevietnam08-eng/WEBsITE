import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { AppProvider } from './app/AppContext';
import { AppShell } from './app/AppShell';
import { ErrorBoundary, SkeletonGrid, ToastProvider } from './ui';

const DashboardPage = lazy(() =>
  import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ReadListPage = lazy(() =>
  import('./features/read/ReadListPage').then((m) => ({ default: m.ReadListPage })),
);
const ReadPracticePage = lazy(() =>
  import('./features/read/ReadPracticePage').then((m) => ({ default: m.ReadPracticePage })),
);
const QaListPage = lazy(() =>
  import('./features/qa/QaListPage').then((m) => ({ default: m.QaListPage })),
);
const QaPracticePage = lazy(() =>
  import('./features/qa/QaPracticePage').then((m) => ({ default: m.QaPracticePage })),
);
const MockExamPage = lazy(() =>
  import('./features/exam/MockExamPage').then((m) => ({ default: m.MockExamPage })),
);
const SettingsPage = lazy(() =>
  import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const KitchenSinkPage = lazy(() =>
  import('./features/kitchen-sink/KitchenSinkPage').then((m) => ({ default: m.KitchenSinkPage })),
);

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <HashRouter>
            <AppShell>
              <Suspense fallback={<SkeletonGrid count={4} />}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/read" element={<ReadListPage />} />
                  <Route path="/read/:id" element={<ReadPracticePage />} />
                  <Route path="/qa" element={<QaListPage />} />
                  <Route path="/qa/:id" element={<QaPracticePage />} />
                  <Route path="/exam" element={<MockExamPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/kitchen-sink" element={<KitchenSinkPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </AppShell>
          </HashRouter>
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
