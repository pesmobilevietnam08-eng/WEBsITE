import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, DiffText, FeedbackLadder, Ruby, ScoreRing, Switch, Tabs } from '../../src/ui';

describe('UI Design System components', () => {
  it('supports keyboard navigation on Tabs', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Tabs
        ariaLabel="Test tabs"
        value="a"
        onChange={onChange}
        options={[
          { value: 'a', label: 'Tab A' },
          { value: 'b', label: 'Tab B' },
        ]}
      />,
    );
    const tabA = screen.getByRole('tab', { name: 'Tab A' });
    tabA.focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('toggles Switch role="switch"', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch label="Furigana" checked={false} onChange={onChange} />);
    const sw = screen.getByRole('switch', { name: 'Furigana' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await user.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders Ruby with proper lang="ja" and rt', () => {
    const { container } = render(<Ruby base="日本語" reading="にほんご" variant="han" />);
    const ruby = container.querySelector('ruby');
    expect(ruby).toHaveAttribute('lang', 'ja');
    expect(ruby?.querySelector('rt')?.textContent).toBe('にほんご');
  });

  it('renders ScoreRing accessible label and DiffText non-color markers', () => {
    render(
      <>
        <ScoreRing value={12} max={15} label="Khá ổn" />
        <DiffText
          tokens={[
            { type: 'match', text: 'あ' },
            { type: 'missing', text: 'い' },
            { type: 'extra', text: 'う' },
          ]}
        />
      </>,
    );
    expect(screen.getByRole('img', { name: /12 trên 15/i })).toBeInTheDocument();
    expect(screen.getByText(/\[い\]/)).toBeInTheDocument();
    expect(screen.getByText(/\+う/)).toBeInTheDocument();
  });

  it('expands/collapses FeedbackLadder items', async () => {
    const user = userEvent.setup();
    render(
      <FeedbackLadder
        entries={[{ id: 'r4', code: 'R4', penalty: '−3', why: 'Câu cụt', hint: 'Thêm です.' }]}
      />,
    );
    const btn = screen.getByRole('button', { name: /R4/ });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    await user.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Thêm です.')).toBeInTheDocument();
  });

  it('disables Button while loading', () => {
    render(<Button loading>Đang chấm</Button>);
    const btn = screen.getByRole('button', { name: 'Đang chấm' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });
});
