import { useEffect, useState } from 'react';
import { loadImageMeta, type ImageDimensions } from '../../data/loaders';
import styles from './PictureView.module.css';

export interface PictureViewProps {
  readonly picKey: string;
  readonly alt: string;
  readonly priority?: boolean;
}

export function PictureView({ picKey, alt, priority = false }: PictureViewProps) {
  const [dims, setDims] = useState<ImageDimensions>({ width: 800, height: 500 });

  useEffect(() => {
    let active = true;
    void loadImageMeta().then((meta) => {
      if (!active) return;
      const found = meta[picKey];
      if (found) setDims(found);
    });
    return () => {
      active = false;
    };
  }, [picKey]);

  const base = `./images/pictures/${encodeURIComponent(picKey)}`;

  return (
    <div className={styles.frame}>
      <picture>
        <source srcSet={`${base}.avif`} type="image/avif" />
        <source srcSet={`${base}.webp`} type="image/webp" />
        <img
          src={`${base}.png`}
          alt={alt}
          width={dims.width}
          height={dims.height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={styles.img}
        />
      </picture>
    </div>
  );
}
