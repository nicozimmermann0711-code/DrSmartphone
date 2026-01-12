const SVG_NS = 'http://www.w3.org/2000/svg';

const createSvgElement = (tag, attrs = {}) => {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      el.setAttribute(key, value);
    }
  });
  return el;
};

const getCentroid = (points) => {
  const total = points.reduce(
    (acc, point) => {
      acc.x += point.x;
      acc.y += point.y;
      return acc;
    },
    { x: 0, y: 0 }
  );
  return {
    x: total.x / points.length,
    y: total.y / points.length
  };
};

export const renderHotspots = (containerEl, imageEl, hotspots = [], { onSelect } = {}) => {
  if (!containerEl || !imageEl) {
    return { reset: () => {} };
  }

  containerEl.classList.add('hotspot-container');
  containerEl.style.position = 'relative';

  const existing = containerEl.querySelector('.hotspot-overlay');
  if (existing) {
    existing.remove();
  }

  const svg = createSvgElement('svg', {
    class: 'hotspot-overlay',
    viewBox: '0 0 100 100',
    preserveAspectRatio: 'xMidYMid meet',
    role: 'presentation'
  });

  const handleActivate = (hotspot, target) => {
    svg.querySelectorAll('.hotspot-shape').forEach(shape => {
      shape.classList.remove('is-active');
      const label = shape.parentElement?.querySelector('.hotspot-label');
      if (label) {
        label.classList.remove('is-visible');
      }
    });

    if (target) {
      target.classList.add('is-active');
      const label = target.parentElement?.querySelector('.hotspot-label');
      if (label) {
        label.classList.add('is-visible');
      }
    }

    if (typeof onSelect === 'function') {
      onSelect(hotspot.areaKey, hotspot.id);
    }
  };

  hotspots.forEach((hotspot) => {
    const group = createSvgElement('g', {
      class: 'hotspot-group',
      'data-area-key': hotspot.areaKey,
      'data-hotspot-id': hotspot.id
    });

    let shape;
    if (hotspot.type === 'rect') {
      shape = createSvgElement('rect', {
        x: hotspot.x * 100,
        y: hotspot.y * 100,
        width: hotspot.w * 100,
        height: hotspot.h * 100,
        rx: 2,
        class: 'hotspot-shape'
      });
    }

    if (hotspot.type === 'polygon') {
      const points = hotspot.points
        .map(point => `${point.x * 100},${point.y * 100}`)
        .join(' ');
      shape = createSvgElement('polygon', {
        points,
        class: 'hotspot-shape'
      });
    }

    if (!shape) {
      return;
    }

    shape.setAttribute('tabindex', '0');
    shape.setAttribute('role', 'button');
    shape.setAttribute('aria-label', hotspot.label);

    const labelCoords = hotspot.type === 'rect'
      ? {
          x: (hotspot.x + hotspot.w / 2) * 100,
          y: (hotspot.y + hotspot.h / 2) * 100
        }
      : getCentroid(hotspot.points);

    const label = createSvgElement('text', {
      x: hotspot.type === 'rect' ? labelCoords.x : labelCoords.x * 100,
      y: hotspot.type === 'rect' ? labelCoords.y : labelCoords.y * 100,
      class: 'hotspot-label'
    });
    label.textContent = hotspot.label;

    shape.addEventListener('click', () => handleActivate(hotspot, shape));
    shape.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleActivate(hotspot, shape);
      }
    });

    group.appendChild(shape);
    group.appendChild(label);
    svg.appendChild(group);
  });

  containerEl.appendChild(svg);

  const reset = () => {
    svg.querySelectorAll('.hotspot-shape').forEach(shape => shape.classList.remove('is-active'));
    svg.querySelectorAll('.hotspot-label').forEach(label => label.classList.remove('is-visible'));
  };

  return { reset };
};
