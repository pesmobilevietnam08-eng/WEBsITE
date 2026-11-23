import { HashRouter, Route, Routes } from 'react-router';
import { ErrorBoundary, ToastProvider } from './ui';
import { KitchenSinkPage } from './features/kitchen-sink/KitchenSinkPage';

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <HashRouter>
          <a href="#main-content" className="skip-link">
            Bỏ qua tới nội dung chính
          </a>
          <Routes>
            <Route path="/" element={<KitchenSinkPage />} />
            <Route path="/kitchen-sink" element={<KitchenSinkPage />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
