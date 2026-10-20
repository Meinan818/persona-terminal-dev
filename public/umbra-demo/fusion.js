(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let mapRaf = 0;
  let sceneRaf = 0;
  let pressTarget = null;
  let mapState = { key: null, current: null, fog: new Set() };

  root.classList.add('umbra-fusion');

  const roomKey = (x, y) => `${x},${y}`;

  const addMapLayer = (grid, current, previous) => {
    const cells = [...grid.querySelectorAll('.map-cell')];
    const fogKeys = new Set();

    cells.forEach((cell, index) => {
      const x = index % 5;
      const y = Math.floor(index / 5);
      const key = roomKey(x, y);
      if (cell.classList.contains('is-fog')) fogKeys.add(key);
      cell.dataset.fusionX = String(x);
      cell.dataset.fusionY = String(y);
      cell.style.setProperty('--i', String(index));
      cell.style.setProperty('--c', String(x));
      cell.style.setProperty('--r', String(y));
      cell.style.setProperty('--fusion-cell-delay', `${(x + y) * 24}ms`);

      const depth = document.createElement('span');
      depth.className = 'fusion-cell-depth';
      depth.setAttribute('aria-hidden', 'true');

      const glow = document.createElement('span');
      glow.className = 'fusion-cell-glow';
      glow.setAttribute('aria-hidden', 'true');

      cell.prepend(depth, glow);

      if (cell.classList.contains('is-current')) {
        const beacon = document.createElement('span');
        beacon.className = 'fusion-cell-beacon';
        beacon.setAttribute('aria-hidden', 'true');
        beacon.innerHTML = '<i></i><b></b>';
        cell.append(beacon);
      }

      if (previous.current && previous.current !== current) {
        if (key === previous.current) cell.classList.add('is-fusion-departed');
        if (key === current) cell.classList.add('is-fusion-arrived');
      }
      if (previous.fog.has(key) && !fogKeys.has(key)) cell.classList.add('is-fusion-unveiled');
    });

    const fog = document.createElement('span');
    fog.className = 'fusion-map-fog';
    fog.setAttribute('aria-hidden', 'true');
    fog.innerHTML = '<i></i><i></i><i></i>';
    grid.append(fog);

    mapState = { key: `${current}:${[...fogKeys].join('|')}`, current, fog: fogKeys };
  };

  const placeViewportBeacon = (grid, currentCell) => {
    const viewport = grid.closest('[data-map-viewport]');
    if (!viewport || !currentCell) return;
    viewport.querySelector('.fusion-viewport-beacon')?.remove();
    const beacon = document.createElement('span');
    beacon.className = 'fusion-viewport-beacon';
    beacon.setAttribute('aria-hidden', 'true');
    beacon.innerHTML = '<i></i><b></b>';
    viewport.append(beacon);

    requestAnimationFrame(() => {
      const viewRect = viewport.getBoundingClientRect();
      const cellRect = currentCell.getBoundingClientRect();
      const left = viewport.scrollLeft + cellRect.left - viewRect.left + cellRect.width / 2;
      const top = viewport.scrollTop + cellRect.top - viewRect.top + cellRect.height / 2;
      beacon.style.left = `${left.toFixed(1)}px`;
      beacon.style.top = `${top.toFixed(1)}px`;
    });
  };

  const centerGrid = grid => {
    const viewport = grid?.closest('[data-map-viewport]');
    const currentCell = grid?.querySelector('.map-cell.is-current');
    if (!viewport || !currentCell || viewport.dataset.fusionUserScrolled === 'true') return;
    const viewRect = viewport.getBoundingClientRect();
    const cellRect = currentCell.getBoundingClientRect();
    const left = viewport.scrollLeft + cellRect.left - viewRect.left + cellRect.width / 2 - viewport.clientWidth / 2;
    const top = viewport.scrollTop + cellRect.top - viewRect.top + cellRect.height / 2 - viewport.clientHeight / 2;
    viewport.scrollTo({
      left: Math.max(0, left),
      top: Math.max(0, top),
      behavior: reduced.matches ? 'auto' : 'smooth',
    });
  };

  const drawMapRoutes = grid => {
    if (!grid?.isConnected) return;
    grid.querySelector('.fusion-map-routes')?.remove();
    const cells = [...grid.querySelectorAll('.map-cell')];
    if (!cells.length) return;

    const width = grid.offsetWidth;
    const height = grid.offsetHeight;
    if (!width || !height) return;

    const segments = [];
    const at = (x, y) => cells.find(cell => Number(cell.dataset.fusionX) === x && Number(cell.dataset.fusionY) === y);
    const isSeen = cell => cell && !cell.classList.contains('is-fog');
    const isTrail = cell => cell?.matches('.is-current,.is-visited,.is-cleared');
    const center = cell => ({
      x: cell.offsetLeft + cell.offsetWidth / 2,
      y: cell.offsetTop + cell.offsetHeight / 2,
    });

    for (const cell of cells) {
      if (!isSeen(cell) || !isTrail(cell)) continue;
      const x = Number(cell.dataset.fusionX);
      const y = Number(cell.dataset.fusionY);
      const from = center(cell);
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const neighbor = at(x + dx, y + dy);
        if (!isSeen(neighbor) || !isTrail(neighbor)) continue;
        const to = center(neighbor);
        segments.push(`M${from.x.toFixed(1)} ${from.y.toFixed(1)}L${to.x.toFixed(1)} ${to.y.toFixed(1)}`);
      }
    }

    if (!segments.length) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('fusion-map-routes');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = `<path class="fusion-route-bed" d="${segments.join('')}"></path><path class="fusion-route-live" d="${segments.join('')}"></path>`;
    grid.prepend(svg);
  };

  const enhanceMap = () => {
    const grid = document.querySelector('#content .map-grid');
    if (!grid) return;
    const cells = [...grid.querySelectorAll('.map-cell')];
    if (grid.dataset.fusionReady === 'true') return;
    const currentCell = cells.find(cell => cell.classList.contains('is-current'));
    const currentIndex = currentCell ? cells.indexOf(currentCell) : -1;
    const current = currentIndex >= 0
      ? roomKey(currentIndex % 5, Math.floor(currentIndex / 5))
      : null;
    const previous = mapState;

    grid.dataset.fusionReady = 'true';
    grid.classList.add('is-fusion-arrive');
    addMapLayer(grid, current, previous);
    placeViewportBeacon(grid, currentCell);
    requestAnimationFrame(() => drawMapRoutes(grid));
    window.setTimeout(() => {
      if (!grid.isConnected) return;
      grid.classList.remove('is-fusion-arrive');
      placeViewportBeacon(grid, currentCell);
      centerGrid(grid);
    }, 920);
  };

  const enhanceScene = () => {
    const content = document.querySelector('#content');
    if (!content) return;
    const pieces = [...content.children].filter(element => element.matches(
      '.page-heading,.map-hud,.map-region,.map-shell,.tower-scene,.home-grid,.duo-layout,.arsenal-list,.journey-ended,.map-board,.map-side,.boss-layout,.story-layout'
    ));
    pieces.forEach((piece, index) => {
      piece.classList.add('fusion-page-piece');
      piece.style.setProperty('--fusion-order', String(index));
    });
  };

  const enterScene = () => {
    cancelAnimationFrame(sceneRaf);
    sceneRaf = requestAnimationFrame(() => {
      const content = document.querySelector('#content');
      if (!content) return;
      content.classList.remove('is-fusion-scene-enter');
      void content.offsetWidth;
      content.classList.add('is-fusion-scene-enter');
      window.setTimeout(() => content.classList.remove('is-fusion-scene-enter'), 460);
    });
  };

  const enhance = () => {
    enhanceScene();
    enhanceMap();
  };

  const observer = new MutationObserver(() => {
    queueMicrotask(enhance);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  enhance();
  enterScene();

  document.addEventListener('pointermove', event => {
    if (reduced.matches) return;
    const viewport = event.target.closest?.('[data-map-viewport]');
    if (!viewport) return;
    const grid = viewport.querySelector('.map-grid');
    if (!grid) return;
    cancelAnimationFrame(mapRaf);
    mapRaf = requestAnimationFrame(() => {
      const rect = viewport.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - .5) * 2));
      const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - .5) * 2));
      grid.style.setProperty('--fusion-look-x', x.toFixed(3));
      grid.style.setProperty('--fusion-look-y', y.toFixed(3));
      grid.style.setProperty('--fusion-tilt-x', `${(-y * 1.4).toFixed(2)}deg`);
      grid.style.setProperty('--fusion-tilt-z', `${(x * 1.2).toFixed(2)}deg`);
    });
  }, { passive: true });

  document.addEventListener('pointermove', event => {
    if (reduced.matches) return;
    const target = event.target.closest?.('button:not(:disabled),[role="button"],a[data-room],.main-button,.flow-button');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    target.style.setProperty('--fusion-px', `${((event.clientX - rect.left) / rect.width) * 100}%`);
    target.style.setProperty('--fusion-py', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    target.classList.add('is-fusion-hovering');
  }, { passive: true });

  document.addEventListener('pointerout', event => {
    const target = event.target.closest?.('button:not(:disabled),[role="button"],a[data-room],.main-button,.flow-button');
    if (!target || target.contains(event.relatedTarget)) return;
    target.classList.remove('is-fusion-hovering');
  }, true);

  document.addEventListener('pointerleave', event => {
    const viewport = event.target.closest?.('[data-map-viewport]');
    const grid = viewport?.querySelector('.map-grid');
    if (!grid) return;
    grid.style.setProperty('--fusion-look-x', '0');
    grid.style.setProperty('--fusion-look-y', '0');
    grid.style.setProperty('--fusion-tilt-x', '0deg');
    grid.style.setProperty('--fusion-tilt-z', '0deg');
  }, true);

  document.addEventListener('pointerdown', event => {
    const target = event.target.closest?.('button:not(:disabled),[role="button"]');
    if (!target) return;
    pressTarget = target;
    target.classList.add('is-fusion-pressing');
  }, true);

  const releasePress = () => {
    if (!pressTarget) return;
    pressTarget.classList.remove('is-fusion-pressing');
    pressTarget = null;
  };

  document.addEventListener('pointerup', releasePress, true);
  document.addEventListener('pointercancel', releasePress, true);

  document.addEventListener('pointerup', event => {
    if (reduced.matches) return;
    const target = event.target.closest?.('button:not(:disabled),[role="button"]');
    const cell = event.target.closest?.('.map-cell');
    if (!target && !cell) return;
    const fx = document.createElement('span');
    fx.className = 'umbra-fusion-fx';
    fx.setAttribute('aria-hidden', 'true');
    fx.style.setProperty('--fx', `${event.clientX}px`);
    fx.style.setProperty('--fy', `${event.clientY}px`);
    if (target?.matches('.main-button,.flow-button,.execute,.trial-go,.map-cell,.map-pad button')) {
      fx.classList.add('is-major');
    }
    document.body.appendChild(fx);
    fx.addEventListener('animationend', () => fx.remove(), { once: true });
    if (target) {
      target.classList.add('is-fusion-released');
      window.setTimeout(() => target.classList.remove('is-fusion-released'), 210);
    }
    if (cell) {
      cell.classList.remove('is-fusion-tapped');
      void cell.offsetWidth;
      cell.classList.add('is-fusion-tapped');
      window.setTimeout(() => cell.classList.remove('is-fusion-tapped'), 280);
    }
  }, true);

  document.addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    const target = event.target.closest?.('button:not(:disabled),[role="button"]');
    target?.classList.add('is-fusion-pressing');
  }, true);

  document.addEventListener('keyup', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    const target = event.target.closest?.('button:not(:disabled),[role="button"]');
    if (!target) return;
    target.classList.remove('is-fusion-pressing');
    target.classList.add('is-fusion-released');
    window.setTimeout(() => target.classList.remove('is-fusion-released'), 210);
  }, true);

  document.addEventListener('click', event => {
    if (!event.target.closest?.('a[data-room]')) return;
    const content = document.querySelector('#content');
    content?.classList.add('is-fusion-scene-leaving');
    window.setTimeout(() => content?.classList.remove('is-fusion-scene-leaving'), 220);
  }, true);

  document.addEventListener('wheel', event => {
    const viewport = event.target.closest?.('[data-map-viewport]');
    if (viewport) viewport.dataset.fusionUserScrolled = 'true';
  }, { capture: true, passive: true });

  document.addEventListener('touchmove', event => {
    const viewport = event.target.closest?.('[data-map-viewport]');
    if (viewport) viewport.dataset.fusionUserScrolled = 'true';
  }, { capture: true, passive: true });

  window.addEventListener('hashchange', () => {
    const content = document.querySelector('#content');
    content?.classList.remove('is-fusion-scene-leaving');
    enterScene();
  });
})();
