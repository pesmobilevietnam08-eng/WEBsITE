import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Intentionally avoid logging sensitive learner data to external telemetry
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <main className={styles.box} role="alert">
          <h1 className={styles.title}>Đã xảy ra sự cố ngoài ý muốn</h1>
          <p className={styles.desc}>
            Ứng dụng gặp lỗi khi hiển thị màn hình này. Tiến độ học của em trên máy vẫn an toàn. Em
            hãy thử tải lại màn hình hoặc quay về trang chủ.
          </p>
          <div className={styles.actions}>
            <Button variant="primary" onClick={this.handleRetry}>
              Thử lại
            </Button>
            <Button variant="secondary" onClick={this.handleReload}>
              Tải lại trang
            </Button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
