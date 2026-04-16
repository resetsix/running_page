import { memo, useEffect } from 'react';
import { useControl } from 'react-map-gl';
import styles from './style.module.css';

type FitBoundsControlProps = {
  onFit: () => void;
  title: string;
};

class FitBoundsControlImpl {
  _container: HTMLDivElement;
  _button: HTMLButtonElement;
  private _onFit: () => void;

  constructor(onFit: () => void, title: string) {
    this._onFit = onFit;

    this._container = document.createElement('div');
    this._container.className = `mapboxgl-ctrl mapboxgl-ctrl-group ${styles.fitControl}`;

    this._button = document.createElement('button');
    this._button.type = 'button';
    this._button.className = styles.fitControlButton;
    this._button.addEventListener('click', this.handleClick);

    const icon = document.createElement('span');
    icon.className = `mapboxgl-ctrl-icon ${styles.fitControlIcon}`;
    icon.setAttribute('aria-hidden', 'true');

    this._button.append(icon);
    this._container.append(this._button);
    this.setTitle(title);
  }

  private handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this._onFit();
  };

  onAdd() {
    return this._container;
  }

  onRemove() {
    this._button.removeEventListener('click', this.handleClick);
    this._container.remove();
  }

  setOnFit(onFit: () => void) {
    this._onFit = onFit;
  }

  setTitle(title: string) {
    this._button.title = title;
    this._button.setAttribute('aria-label', title);
  }
}

const FitBoundsControl = ({ onFit, title }: FitBoundsControlProps) => {
  const control = useControl<FitBoundsControlImpl>(
    () => new FitBoundsControlImpl(onFit, title),
    {
      position: 'bottom-right',
    }
  );

  useEffect(() => {
    control.setOnFit(onFit);
    control.setTitle(title);
  }, [control, onFit, title]);

  return null;
};

export default memo(FitBoundsControl);
