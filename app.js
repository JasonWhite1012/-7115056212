/**
 * Personal Page Dashboard Engine
 * Handles real-time clock, greetings, time format switching,
 * dynamic timezone/date calculation, and interactive identity editing.
 */

(() => {
  'use strict';

  // --- DOM Elements ---
  const hoursEl = document.getElementById('clock-hours');
  const minutesEl = document.getElementById('clock-minutes');
  const secondsEl = document.getElementById('clock-seconds');
  const ampmEl = document.getElementById('clock-ampm');
  const secondsProgressEl = document.getElementById('seconds-progress');
  const formatToggleBtn = document.getElementById('format-toggle');
  const formatLabelEl = document.getElementById('format-label');

  const greetingContainer = document.getElementById('greeting-container');
  const greetingTextEl = document.getElementById('greeting-text');
  const greetingIconEl = document.getElementById('greeting-icon');

  const currentDateEl = document.getElementById('current-date');
  const currentTimezoneEl = document.getElementById('current-timezone');
  const dayOfYearEl = document.getElementById('day-of-year');
  const weekNumberEl = document.getElementById('week-number');

  const userNameEl = document.getElementById('user-name');
  const editNameBtn = document.getElementById('edit-name-btn');
  const avatarMonogramEl = document.getElementById('avatar-monogram');

  const statusPill = document.getElementById('status-pill');
  const statusTextEl = document.getElementById('status-text');
  const editStatusBtn = document.getElementById('edit-status-btn');

  const editDialog = document.getElementById('edit-dialog');
  const dialogForm = document.getElementById('dialog-form');
  const dialogTitle = document.getElementById('dialog-title');
  const dialogInput = document.getElementById('dialog-input');
  const dialogCancelBtn = document.getElementById('dialog-cancel-btn');

  const toastEl = document.getElementById('toast');
  const toastMessageEl = document.getElementById('toast-message');

  // --- State Configuration ---
  const STORAGE_KEY_FORMAT = 'personal_clock_format';
  const STORAGE_KEY_NAME = 'personal_user_name';
  const STORAGE_KEY_STATUS = 'personal_user_status';

  let is24HourFormat = localStorage.getItem(STORAGE_KEY_FORMAT) === '24';
  let activeEditTarget = null; // 'name' or 'status'
  let toastTimeout = null;

  // --- Dynamic Greeting Icons (SVG) ---
  const ICONS = {
    morning: `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 18a5 5 0 0 0-10 0"></path>
        <line x1="12" y1="2" x2="12" y2="9"></line>
        <line x1="4.22" y1="10.22" x2="5.64" y2="11.64"></line>
        <line x1="1" y1="18" x2="3" y2="18"></line>
        <line x1="21" y1="18" x2="23" y2="18"></line>
        <line x1="18.36" y1="11.64" x2="19.78" y2="10.22"></line>
        <line x1="23" y1="22" x2="1" y2="22"></line>
      </svg>
    `,
    afternoon: `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#facc15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    `,
    evening: `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 10a4 4 0 0 0-4 4 4 4 0 0 0 8 0 4 4 0 0 0-4-4z"></path>
        <line x1="12" y1="2" x2="12" y2="4"></line>
        <line x1="4.93" y1="4.93" x2="6.34" y2="6.34"></line>
        <line x1="2" y1="14" x2="4" y2="14"></line>
        <line x1="20" y1="14" x2="22" y2="14"></line>
        <line x1="17.66" y1="6.34" x2="19.07" y2="4.93"></line>
        <path d="M2 18h20"></path>
        <path d="M20 22H4"></path>
      </svg>
    `,
    night: `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#818cf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `
  };

  // --- Helper Functions ---
  const padZero = (n) => String(n).padStart(2, '0');

  const showToast = (message) => {
    toastMessageEl.textContent = message;
    toastEl.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2500);
  };

  const getMonogram = (name) => {
    if (!name || !name.trim()) return 'JW';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      // First letter of first two words (e.g. Jason White -> JW)
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const getDayOfYear = (date) => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  const getWeekNumber = (date) => {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
  };

  const getTimezoneOffsetString = () => {
    const offsetMinutes = -new Date().getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const mins = Math.abs(offsetMinutes) % 60;
    const gmtStr = mins === 0 ? `GMT${sign}${hours}` : `GMT${sign}${hours}:${padZero(mins)}`;
    
    let timeZoneName = 'Local';
    try {
      timeZoneName = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
    } catch (e) {
      // fallback
    }
    return `${gmtStr} (${timeZoneName})`;
  };

  // --- Clock & Time Rendering Engine ---
  let lastSecond = -1;

  const updateClock = () => {
    const now = new Date();
    const currentSec = now.getSeconds();

    // Avoid DOM rewrites if second hasn't changed
    if (currentSec === lastSecond) return;
    lastSecond = currentSec;

    const rawHours = now.getHours();
    const minutes = now.getMinutes();
    const milliseconds = now.getMilliseconds();

    // 12h vs 24h calculation
    let displayHours = rawHours;
    let ampm = '';

    if (is24HourFormat) {
      ampmEl.classList.add('hidden');
    } else {
      ampmEl.classList.remove('hidden');
      ampm = rawHours >= 12 ? 'PM' : 'AM';
      displayHours = rawHours % 12 || 12;
      ampmEl.textContent = ampm;
    }

    hoursEl.textContent = padZero(displayHours);
    minutesEl.textContent = padZero(minutes);
    secondsEl.textContent = padZero(currentSec);

    // Update seconds progress bar
    const progressPercent = ((currentSec / 60) * 100).toFixed(1);
    secondsProgressEl.style.width = `${progressPercent}%`;

    // Hourly contextual updates (Greeting, Date, Timezone)
    updateContextualData(now, rawHours);
  };

  const updateContextualData = (now, hours) => {
    // 1. Dynamic Greeting & Icon
    let greeting = 'Good day';
    let iconKey = 'afternoon';

    if (hours >= 5 && hours < 12) {
      greeting = 'Good morning';
      iconKey = 'morning';
    } else if (hours >= 12 && hours < 17) {
      greeting = 'Good afternoon';
      iconKey = 'afternoon';
    } else if (hours >= 17 && hours < 22) {
      greeting = 'Good evening';
      iconKey = 'evening';
    } else {
      greeting = 'Good night';
      iconKey = 'night';
    }

    greetingTextEl.textContent = greeting;
    greetingIconEl.innerHTML = ICONS[iconKey];

    // 2. Formatted Date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateEl.textContent = now.toLocaleDateString(undefined, dateOptions);

    // 3. Timezone
    currentTimezoneEl.textContent = getTimezoneOffsetString();

    // 4. Day of year & Week number
    dayOfYearEl.textContent = `Day ${getDayOfYear(now)}`;
    weekNumberEl.textContent = `W${padZero(getWeekNumber(now))}`;
  };

  // --- Clock Loop via RequestAnimationFrame ---
  const startClockLoop = () => {
    updateClock();
    const loop = () => {
      updateClock();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };

  // --- Format Toggle Handler ---
  const updateToggleUI = () => {
    if (is24HourFormat) {
      formatToggleBtn.classList.add('active');
      formatLabelEl.textContent = '24H';
    } else {
      formatToggleBtn.classList.remove('active');
      formatLabelEl.textContent = '12H';
    }
    lastSecond = -1; // force clock re-render
    updateClock();
  };

  formatToggleBtn.addEventListener('click', () => {
    is24HourFormat = !is24HourFormat;
    localStorage.setItem(STORAGE_KEY_FORMAT, is24HourFormat ? '24' : '12');
    updateToggleUI();
    showToast(`Switched to ${is24HourFormat ? '24-hour' : '12-hour'} format`);
  });

  // --- User Identity Management (Name & Monogram) ---
  const initIdentity = () => {
    const savedName = localStorage.getItem(STORAGE_KEY_NAME);
    if (savedName && savedName.trim()) {
      userNameEl.textContent = savedName.trim();
    } else {
      userNameEl.textContent = userNameEl.textContent.trim() || 'Jason White 張家誠';
    }
    avatarMonogramEl.textContent = getMonogram(userNameEl.textContent);

    const savedStatus = localStorage.getItem(STORAGE_KEY_STATUS);
    if (savedStatus && savedStatus.trim()) {
      statusTextEl.textContent = savedStatus.trim();
    }
  };

  const openEditDialog = (type) => {
    activeEditTarget = type;
    if (type === 'name') {
      dialogTitle.textContent = 'Update Your Name';
      dialogInput.placeholder = 'e.g. Jason White 張家誠';
      dialogInput.value = userNameEl.textContent;
    } else {
      dialogTitle.textContent = 'Update Status & Daily Focus';
      dialogInput.placeholder = 'e.g. 🏓 元智資工 ➔ 資工碩士班';
      dialogInput.value = statusTextEl.textContent;
    }
    editDialog.showModal();
    dialogInput.focus();
    dialogInput.select();
  };

  const saveEdit = (value) => {
    const cleanVal = value.trim();
    if (!cleanVal) return;

    if (activeEditTarget === 'name') {
      userNameEl.textContent = cleanVal;
      avatarMonogramEl.textContent = getMonogram(cleanVal);
      localStorage.setItem(STORAGE_KEY_NAME, cleanVal);
      showToast('Name updated successfully');
    } else {
      statusTextEl.textContent = cleanVal;
      localStorage.setItem(STORAGE_KEY_STATUS, cleanVal);
      showToast('Status updated successfully');
    }
    editDialog.close();
  };

  // Event Listeners for Editing
  userNameEl.addEventListener('click', () => openEditDialog('name'));
  editNameBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openEditDialog('name');
  });

  statusPill.addEventListener('click', () => openEditDialog('status'));
  editStatusBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openEditDialog('status');
  });

  dialogForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveEdit(dialogInput.value);
  });

  dialogCancelBtn.addEventListener('click', () => {
    editDialog.close();
  });

  editDialog.addEventListener('click', (e) => {
    // Click outside dialog to close
    const rect = editDialog.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      editDialog.close();
    }
  });

  // Keyboard accessibility
  userNameEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openEditDialog('name');
    }
  });

  statusPill.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openEditDialog('status');
    }
  });

  // --- Initialize Everything ---
  initIdentity();
  updateToggleUI();
  startClockLoop();

})();
