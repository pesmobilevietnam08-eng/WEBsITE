import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { AppProvider } from './app/AppContext';
import { AppShell } from './app/AppShell';
import { Card, ErrorBoundary, SkeletonGrid, ToastProvider } from './ui';

const SettingsPage = lazy(() =>
  import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const KitchenSinkPage = lazy(() =>
  import('./features/kitchen-sink/KitchenSinkPage').then((m) => ({ default: m.KitchenSinkPage })),
);

function SectionPlaceholder({ title, desc }: { title: string; desc: string }) {
  return (
    <Card ruled>
      <h1>{title}</h1>
      <p>{desc}</p>
    </Card>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <HashRouter>
            <AppShell>
              <Suspense fallback={<SkeletonGrid count={4} />}>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <SectionPlaceholder
                        title="Tiến độ luyện tập JPD113"
                        desc="Tổng quan tiến độ, chuỗi ngày luyện tập và câu yếu cần ôn lại."
                      />
                    }
                  />
                  <Route
                    path="/read/*"
                    element={
                      <SectionPlaceholder
                        title="Luyện đọc thành tiếng"
                        desc="Chọn Bài 1–3 và luyện đọc 44 đoạn văn có chấm theo nhóm chữ."
                      />
                    }
                  />
                  <Route
                    path="/qa/*"
                    element={
                      <SectionPlaceholder
                        title="Luyện vấn đáp"
                        desc="Ngẫu nhiên, Có tranh (31 câu) và Không tranh (32 câu)."
                      />
                    }
                  />
                  <Route
                    path="/exam"
                    element={
                      <SectionPlaceholder
                        title="Thi thử có giới hạn thời gian"
                        desc="Mô phỏng phòng thi nói JPD113 gồm đọc đoạn văn và vấn đáp."
                      />
                    }
                  />
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
