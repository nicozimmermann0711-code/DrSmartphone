import { renderHotspots } from './hotspots.js';

const STORAGE_KEY = 'ds48-booking-state';

const defaultState = {
  selectedDeviceId: null,
  selectedAreaKey: null,
  selectedServiceKeys: []
};

const areaLabels = {
  screen: 'Display',
  battery: 'Akku',
  port: 'Port',
  back: 'Backcover',
  camera: 'Kamera',
  buttons: 'Buttons',
  speaker: 'Speaker',
  joystick: 'Joystick',
  hdmi: 'HDMI',
  vent: 'Lüfter',
  other: 'Sonstiges'
};

const formatCurrency = (cents) => {
  const value = cents / 100;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
};

const loadState = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { ...defaultState };
  }
  try {
    const parsed = JSON.parse(stored);
    return { ...defaultState, ...parsed };
  } catch {
    return { ...defaultState };
  }
};

const saveState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const bookingState = loadState();

const initBooking = async () => {
  const [devices, services] = await Promise.all([
    fetch('/assets/data/devices.json').then(res => res.json()),
    fetch('/assets/data/services.json').then(res => res.json())
  ]);

  const deviceGrid = document.getElementById('device-grid');
  const brandChips = document.getElementById('brand-chips');
  const deviceSearch = document.getElementById('device-search');
  const selectedDeviceLabel = document.getElementById('selected-device-label');
  const selectedAreaLabel = document.getElementById('selected-area-label');
  const modal = document.getElementById('device-modal');
  const modalImage = document.getElementById('device-modal-image');
  const modalTitle = document.getElementById('device-modal-title');
  const modalArea = document.getElementById('modal-selected-area');
  const modalWrapper = document.getElementById('device-image-wrapper');
  const resetButton = document.getElementById('hotspot-reset');
  const serviceList = document.getElementById('service-list');
  const quoteDevice = document.getElementById('quote-device');
  const quoteArea = document.getElementById('quote-area');
  const quoteServices = document.getElementById('quote-services');
  const quoteTotal = document.getElementById('quote-total');

  let activeCategory = 'smartphones';
  let activeBrand = 'all';
  let hotspotController = null;

  const updateSelectedLabels = () => {
    const device = devices.find(item => item.id === bookingState.selectedDeviceId);
    if (device) {
      selectedDeviceLabel.textContent = `${device.brand} ${device.model}`;
      quoteDevice.textContent = `${device.brand} ${device.model}`;
    } else {
      selectedDeviceLabel.textContent = 'Noch kein Gerät gewählt';
      quoteDevice.textContent = 'Noch kein Gerät';
    }

    if (bookingState.selectedAreaKey) {
      const label = areaLabels[bookingState.selectedAreaKey] || bookingState.selectedAreaKey;
      selectedAreaLabel.textContent = label;
      modalArea.textContent = label;
      quoteArea.textContent = label;
    } else {
      selectedAreaLabel.textContent = 'Keine Zone gewählt';
      modalArea.textContent = 'Keine Zone';
      quoteArea.textContent = 'Keine Zone';
    }
  };

  const renderServices = () => {
    serviceList.innerHTML = '';
    services.forEach(service => {
      const item = document.createElement('label');
      item.className = 'service-card';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'service';
      input.value = service.key;
      input.checked = bookingState.selectedServiceKeys.includes(service.key);

      input.addEventListener('change', () => {
        if (input.checked) {
          if (!bookingState.selectedServiceKeys.includes(service.key)) {
            bookingState.selectedServiceKeys.push(service.key);
          }
        } else {
          bookingState.selectedServiceKeys = bookingState.selectedServiceKeys.filter(key => key !== service.key);
        }
        saveState(bookingState);
        updateQuote();
      });

      const name = document.createElement('span');
      name.className = 'service-name';
      name.textContent = service.name;

      const price = document.createElement('span');
      price.className = 'service-price';
      price.textContent = formatCurrency(service.base_price_cents);

      item.appendChild(input);
      item.appendChild(name);
      item.appendChild(price);
      serviceList.appendChild(item);
    });
  };

  const updateServiceSelections = () => {
    serviceList.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = bookingState.selectedServiceKeys.includes(input.value);
    });
  };

  const applySuggestedServices = (areaKey) => {
    const suggestions = services
      .filter(service => service.supportedAreas.includes(areaKey))
      .map(service => service.key);

    const merged = new Set(bookingState.selectedServiceKeys);
    suggestions.forEach(key => merged.add(key));
    bookingState.selectedServiceKeys = Array.from(merged);
    saveState(bookingState);
    updateServiceSelections();
    updateQuote();
  };

  const updateQuote = () => {
    const device = devices.find(item => item.id === bookingState.selectedDeviceId);
    const pricingFactor = device?.pricingFactor ?? 1;
    quoteServices.innerHTML = '';

    let total = 0;
    bookingState.selectedServiceKeys.forEach(key => {
      const service = services.find(item => item.key === key);
      if (!service) {
        return;
      }
      const row = document.createElement('div');
      row.className = 'quote-service-row';

      const name = document.createElement('span');
      name.textContent = service.name;

      const price = document.createElement('strong');
      const adjusted = Math.round(service.base_price_cents * pricingFactor);
      price.textContent = formatCurrency(adjusted);
      total += adjusted;

      row.appendChild(name);
      row.appendChild(price);
      quoteServices.appendChild(row);
    });

    quoteTotal.textContent = formatCurrency(total);
    updateSelectedLabels();
  };

  const renderDeviceCards = () => {
    const searchTerm = deviceSearch.value.trim().toLowerCase();
    deviceGrid.innerHTML = '';

    const filtered = devices.filter(device => {
      const matchesCategory = device.category === activeCategory;
      const matchesBrand = activeBrand === 'all' || device.brand === activeBrand;
      const matchesSearch = `${device.brand} ${device.model}`.toLowerCase().includes(searchTerm);
      return matchesCategory && matchesBrand && matchesSearch;
    });

    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'device-empty';
      empty.textContent = 'Keine Geräte gefunden. Bitte Filter anpassen.';
      deviceGrid.appendChild(empty);
      return;
    }

    filtered.forEach(device => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'device-card';
      card.setAttribute('role', 'listitem');
      card.setAttribute('aria-label', `${device.brand} ${device.model}`);
      if (bookingState.selectedDeviceId === device.id) {
        card.classList.add('is-selected');
      }

      const img = document.createElement('img');
      img.src = device.image;
      img.alt = `${device.brand} ${device.model}`;
      img.loading = 'lazy';

      const meta = document.createElement('div');
      meta.className = 'device-meta';

      const brand = document.createElement('span');
      brand.className = 'device-brand';
      brand.textContent = device.brand;

      const model = document.createElement('strong');
      model.className = 'device-model';
      model.textContent = device.model;

      meta.appendChild(brand);
      meta.appendChild(model);
      card.appendChild(img);
      card.appendChild(meta);

      card.addEventListener('click', () => {
        bookingState.selectedDeviceId = device.id;
        saveState(bookingState);
        updateSelectedLabels();
        renderDeviceCards();
        openDeviceModal(device);
        updateQuote();
      });

      deviceGrid.appendChild(card);
    });
  };

  const renderBrandChips = () => {
    brandChips.innerHTML = '';
    const brands = devices
      .filter(device => device.category === activeCategory)
      .map(device => device.brand);
    const uniqueBrands = ['all', ...Array.from(new Set(brands))];

    uniqueBrands.forEach(brand => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'filter-chip';
      chip.textContent = brand === 'all' ? 'Alle' : brand;
      chip.dataset.brand = brand;
      if (activeBrand === brand) {
        chip.classList.add('is-active');
      }
      chip.addEventListener('click', () => {
        activeBrand = brand;
        renderBrandChips();
        renderDeviceCards();
      });
      brandChips.appendChild(chip);
    });
  };

  const openDeviceModal = (device) => {
    modalImage.src = device.image;
    modalImage.alt = `${device.brand} ${device.model}`;
    modalTitle.textContent = `${device.brand} ${device.model}`;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');

    hotspotController = renderHotspots(modalWrapper, modalImage, device.hotspots, {
      onSelect: (areaKey) => {
        bookingState.selectedAreaKey = areaKey;
        saveState(bookingState);
        applySuggestedServices(areaKey);
        updateSelectedLabels();
      }
    });
  };

  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  };

  document.querySelectorAll('[data-modal-close]').forEach(el => {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });

  resetButton.addEventListener('click', () => {
    bookingState.selectedAreaKey = null;
    saveState(bookingState);
    if (hotspotController) {
      hotspotController.reset();
    }
    updateSelectedLabels();
  });

  deviceSearch.addEventListener('input', renderDeviceCards);

  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      activeCategory = tab.dataset.category;
      activeBrand = 'all';
      renderBrandChips();
      renderDeviceCards();
    });
  });

  renderBrandChips();
  renderServices();
  renderDeviceCards();
  updateQuote();

  if (bookingState.selectedDeviceId) {
    const device = devices.find(item => item.id === bookingState.selectedDeviceId);
    if (device) {
      updateSelectedLabels();
    }
  }
};

if (document.getElementById('device-grid')) {
  initBooking();
}
