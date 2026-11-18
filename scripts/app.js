(function () {
      'use strict';

      const MONTHS_MK = [
        'Јануари', 'Февруари', 'Март', 'Април', 'Мај', 'Јуни',
        'Јули', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'
      ];

      const WEEKDAYS_MK = [
        'Недела', 'Понеделник', 'Вторник', 'Среда', 'Четврток', 'Петок', 'Сабота'
      ];

      const COLOR_THEMES = {
        blue: { dot: '#2563eb', pillBg: '#e4eeff', pillText: '#1e3a8a', cardBg: 'linear-gradient(135deg, #e7f0fe 0%, #f3f7ff 100%)', cardBorder: '#2563eb', iconColor: '#1d4ed8', badgeBg: '#dbeafe', badgeText: '#1e40af' },
        emerald: { dot: '#10b981', pillBg: '#e1f7ec', pillText: '#065f46', cardBg: 'linear-gradient(135deg, #e2f7ec 0%, #f2fbf7 100%)', cardBorder: '#10b981', iconColor: '#059669', badgeBg: '#d1fae5', badgeText: '#065f46' },
        amber: { dot: '#f59e0b', pillBg: '#fef0dc', pillText: '#92400e', cardBg: 'linear-gradient(135deg, #fef0dc 0%, #fffaf2 100%)', cardBorder: '#f59e0b', iconColor: '#d97706', badgeBg: '#fef3c7', badgeText: '#92400e' },
        purple: { dot: '#8b5cf6', pillBg: '#f0e7fe', pillText: '#5b21b6', cardBg: 'linear-gradient(135deg, #f0e7fe 0%, #f9f5ff 100%)', cardBorder: '#8b5cf6', iconColor: '#7c3aed', badgeBg: '#ede9fe', badgeText: '#5b21b6' },
        rose: { dot: '#f43f5e', pillBg: '#ffe4e8', pillText: '#9f1239', cardBg: 'linear-gradient(135deg, #ffe4e8 0%, #fff5f6 100%)', cardBorder: '#f43f5e', iconColor: '#e11d48', badgeBg: '#ffe4e6', badgeText: '#9f1239' },
        cyan: { dot: '#06b6d4', pillBg: '#dff7fc', pillText: '#155e75', cardBg: 'linear-gradient(135deg, #dff7fc 0%, #f2fcfe 100%)', cardBorder: '#06b6d4', iconColor: '#0891b2', badgeBg: '#cffafe', badgeText: '#155e75' }
      };

      const DEFAULT_DRIVERS = [
        { id: 'bojan', name: 'Бојан', color: 'blue' },
        { id: 'pavel', name: 'Павел', color: 'emerald' },
        { id: 'kiril', name: 'Кирил', color: 'amber' },
        { id: 'ana', name: 'Ана', color: 'purple' }
      ];

      const STORAGE_KEYS = {
        DRIVERS: 'mk_commute_drivers_v1',
        LOGS: 'mk_commute_logs_v1'
      };

      const memoryStorage = {};
      let isLocalStoragePersistent = false;

      function detectLocalStorage() {
        try {
          const testKey = '__mk_commute_test__';
          window.localStorage.setItem(testKey, '1');
          window.localStorage.removeItem(testKey);
          isLocalStoragePersistent = true;
        } catch (e) {
          isLocalStoragePersistent = false;
        }
      }
      detectLocalStorage();

      function safeGetItem(key) {
        if (isLocalStoragePersistent) {
          try {
            return window.localStorage.getItem(key);
          } catch (e) {}
        }
        return Object.prototype.hasOwnProperty.call(memoryStorage, key) ? memoryStorage[key] : null;
      }

      function safeSetItem(key, value) {
        memoryStorage[key] = value;
        if (isLocalStoragePersistent) {
          try {
            window.localStorage.setItem(key, value);
          } catch (e) {}
        }
      }

      function loadDrivers() {
        try {
          const raw = safeGetItem(STORAGE_KEYS.DRIVERS);
          if (raw) {
            const p = JSON.parse(raw);
            if (Array.isArray(p) && p.length > 0) return p;
          }
        } catch (e) {}
        return JSON.parse(JSON.stringify(DEFAULT_DRIVERS));
      }

      function saveDrivers() {
        safeSetItem(STORAGE_KEYS.DRIVERS, JSON.stringify(drivers));
      }

      function loadLogs() {
        try {
          const raw = safeGetItem(STORAGE_KEYS.LOGS);
          if (raw) { const p = JSON.parse(raw); if (p && typeof p === 'object') return p; }
        } catch (e) {}
        return {};
      }

      function saveLogs() {
        safeSetItem(STORAGE_KEYS.LOGS, JSON.stringify(commuteLogs));
      }

      function getRealLocalNow() {
        return new Date();
      }

      function formatDateKey(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }

      function parseDateKey(dateKey) {
        const parts = dateKey.split('-').map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }

      function getDriverById(id) {
        return drivers.find(d => d.id === id) || null;
      }

      function escapeHtml(str) {
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      let toastTimer = null;
      function showToast(msg) {
        const el = document.getElementById('toast');
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          el.classList.add('hidden');
        }, 2500);
      }

      function getNthWeekdayOfMonth(year, monthIndex, weekday, n) {
        const firstDay = new Date(year, monthIndex, 1).getDay();
        const offset = (weekday - firstDay + 7) % 7;
        const day = 1 + offset + (n - 1) * 7;
        return new Date(year, monthIndex, day);
      }

      function getLastWeekdayOfMonth(year, monthIndex, weekday) {
        const lastDate = new Date(year, monthIndex + 1, 0);
        const lastDay = lastDate.getDay();
        const diff = (lastDay - weekday + 7) % 7;
        return new Date(year, monthIndex, lastDate.getDate() - diff);
      }

      function addObservedHoliday(map, dateObj, name) {
        const dow = dateObj.getDay();
        map[formatDateKey(dateObj)] = name;
        if (dow === 6) {
          const fri = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() - 1);
          map[formatDateKey(fri)] = `${name} (Observed)`;
        } else if (dow === 0) {
          const mon = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1);
          map[formatDateKey(mon)] = `${name} (Observed)`;
        }
      }

      function getUSFederalHolidaysForYear(year) {
        const holidays = {};
        addObservedHoliday(holidays, new Date(year, 0, 1), "New Year's Day");
        holidays[formatDateKey(getNthWeekdayOfMonth(year, 0, 1, 3))] = 'MLK Jr. Day';
        holidays[formatDateKey(getNthWeekdayOfMonth(year, 1, 1, 3))] = "Presidents' Day";
        holidays[formatDateKey(getLastWeekdayOfMonth(year, 4, 1))] = 'Memorial Day';
        addObservedHoliday(holidays, new Date(year, 5, 19), 'Juneteenth');
        addObservedHoliday(holidays, new Date(year, 6, 4), 'Independence Day');
        holidays[formatDateKey(getNthWeekdayOfMonth(year, 8, 1, 1))] = 'Labor Day';
        holidays[formatDateKey(getNthWeekdayOfMonth(year, 9, 1, 2))] = 'Columbus Day';
        addObservedHoliday(holidays, new Date(year, 10, 11), 'Veterans Day');
        holidays[formatDateKey(getNthWeekdayOfMonth(year, 10, 4, 4))] = 'Thanksgiving';
        addObservedHoliday(holidays, new Date(year, 11, 25), 'Christmas Day');
        return holidays;
      }

      let drivers = loadDrivers();
      let commuteLogs = loadLogs();
      const realToday = getRealLocalNow();
      let viewYear = realToday.getFullYear();
      let viewMonth = realToday.getMonth();
      let activePopoverDateKey = null;

      function renderPopoverDrivers() {
        const list = document.getElementById('popover-driver-list');
        if (!list || !activePopoverDateKey) return;
        list.innerHTML = '';
        const selected = Array.isArray(commuteLogs[activePopoverDateKey]) ? commuteLogs[activePopoverDateKey] : [];

        drivers.forEach(drv => {
          const theme = COLOR_THEMES[drv.color] || COLOR_THEMES.blue;
          const isSelected = selected.includes(drv.id);
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition cursor-pointer ${
            isSelected
              ? 'border-blue-500 bg-blue-50/70 shadow-2xs'
              : 'border-slate-200/80 bg-white hover:bg-slate-50'
          }`;
          btn.innerHTML = `
            <span class="flex items-center gap-2.5 min-w-0">
              <span class="w-3 h-3 rounded-full shrink-0" style="background-color:${theme.dot}"></span>
              <span class="text-xs sm:text-sm font-bold text-slate-800 truncate">${escapeHtml(drv.name)}</span>
            </span>
            <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              isSelected ? 'bg-blue-600 text-white' : 'border border-slate-300 text-transparent'
            }">✓</span>
          `;
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDriverForDay(activePopoverDateKey, drv.id);
          });
          list.appendChild(btn);
        });
      }

      function openDayPopover(dateKey) {
        activePopoverDateKey = dateKey;
        const dt = parseDateKey(dateKey);
        const holidayMap = getUSFederalHolidaysForYear(dt.getFullYear());
        const holidayName = holidayMap[dateKey];

        const titleEl = document.getElementById('popover-date-title');
        const subEl = document.getElementById('popover-day-subtitle');
        if (titleEl) titleEl.textContent = `${dt.getDate()} ${MONTHS_MK[dt.getMonth()]} ${dt.getFullYear()}`;
        if (subEl) {
          subEl.textContent = holidayName
            ? `${WEEKDAYS_MK[dt.getDay()]} • 🇺🇸 ${holidayName}`
            : WEEKDAYS_MK[dt.getDay()];
        }

        renderPopoverDrivers();

        const backdrop = document.getElementById('day-popover-backdrop');
        if (backdrop) backdrop.classList.remove('hidden');
      }

      function toggleDriverForDay(dateKey, driverId) {
        const current = Array.isArray(commuteLogs[dateKey]) ? commuteLogs[dateKey] : [];
        if (current.includes(driverId)) {
          delete commuteLogs[dateKey];
        } else {
          commuteLogs[dateKey] = [driverId];
        }
        saveLogs();
        renderPopoverDrivers();
        renderAll();
      }

      function closeDayPopover() {
        const backdrop = document.getElementById('day-popover-backdrop');
        if (backdrop) backdrop.classList.add('hidden');
        activePopoverDateKey = null;
      }

      function renderAll() {
        const now = getRealLocalNow();
        const todayKey = formatDateKey(now);

        const monthLabel = document.getElementById('current-month-label');
        if (monthLabel) monthLabel.textContent = `${MONTHS_MK[viewMonth]} ${viewYear}`;

        const holidayMap = {
          ...getUSFederalHolidaysForYear(viewYear - 1),
          ...getUSFederalHolidaysForYear(viewYear),
          ...getUSFederalHolidaysForYear(viewYear + 1)
        };

        const monthCounts = {};
        drivers.forEach(d => { monthCounts[d.id] = 0; });

        // 1. RENDER DESKTOP GRID CALENDAR
        const desktopGrid = document.getElementById('calendar-grid-desktop');
        if (desktopGrid) {
          desktopGrid.innerHTML = '';
          desktopGrid.className = 'grid grid-cols-7 divide-x divide-y divide-slate-200/75 bg-white animate-grid';

          const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
          const startOffset = (firstDayOfWeek === 0) ? 6 : firstDayOfWeek - 1;
          const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
          const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

          for (let i = 0; i < totalCells; i++) {
            const cellDate = new Date(viewYear, viewMonth, 1 - startOffset + i);
            const cellYear = cellDate.getFullYear();
            const cellMonth = cellDate.getMonth();
            const cellDay = cellDate.getDate();
            const dateKey = formatDateKey(cellDate);

            const isCurrentMonth = (cellMonth === viewMonth && cellYear === viewYear);
            const dow = cellDate.getDay();
            const isWeekend = (dow === 0 || dow === 6);
            const usHolidayName = holidayMap[dateKey] || null;
            const isToday = (dateKey === todayKey);

            const rawDayDrivers = (!isWeekend && Array.isArray(commuteLogs[dateKey])) ? commuteLogs[dateKey] : [];
            const validDayDrivers = rawDayDrivers.filter(id => Boolean(getDriverById(id))).slice(0, 1);

            if (isCurrentMonth && !isWeekend) {
              validDayDrivers.forEach(id => { monthCounts[id] = (monthCounts[id] || 0) + 1; });
            }

            const cell = document.createElement('div');
            let cellClasses = 'calendar-cell relative min-w-0 overflow-hidden min-h-[76px] lg:min-h-[82px] p-1.5 lg:p-2 flex flex-col justify-between select-none ';

            if (!isCurrentMonth) {
              cellClasses += 'bg-slate-50/70 text-slate-300 ';
              if (isWeekend) cellClasses += 'weekend-pattern ';
            } else if (isWeekend) {
              cellClasses += 'weekend-pattern text-slate-400 cursor-not-allowed ';
            } else if (usHolidayName) {
              cellClasses += 'holiday-pattern hover:brightness-[0.98] text-slate-800 cursor-pointer group ';
            } else {
              cellClasses += 'bg-white hover:bg-blue-50/45 text-slate-800 cursor-pointer group ';
            }

            if (isToday) {
              cellClasses += 'ring-2 ring-inset ring-blue-500 bg-blue-50/20 ';
            }

            cell.className = cellClasses;

            const topRow = document.createElement('div');
            topRow.className = 'flex items-start justify-between gap-1 min-w-0';

            const dayNumSpan = document.createElement('span');
            dayNumSpan.textContent = cellDay;
            dayNumSpan.className = isToday
              ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-extrabold shadow-xs shrink-0'
              : `text-xs font-bold shrink-0 leading-5 ${isCurrentMonth ? (isWeekend ? 'text-slate-400' : 'text-slate-800') : 'text-slate-300'}`;

            topRow.appendChild(dayNumSpan);

            if (isCurrentMonth && usHolidayName) {
              const holBadge = document.createElement('span');
              holBadge.className = 'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100/95 text-amber-800 border border-amber-300/80 leading-tight whitespace-normal break-words text-right';
              holBadge.title = `US Holiday: ${usHolidayName}`;
              holBadge.innerHTML = `<span class="shrink-0">🇺🇸</span><span>${escapeHtml(usHolidayName)}</span>`;
              topRow.appendChild(holBadge);
            } else if (isCurrentMonth && isWeekend) {
              const wkBadge = document.createElement('span');
              wkBadge.className = 'text-[9px] font-medium text-slate-400/90 px-1 py-0.5 rounded bg-slate-200/50 whitespace-nowrap';
              wkBadge.textContent = 'Неработен';
              topRow.appendChild(wkBadge);
            } else if (isCurrentMonth && !isWeekend) {
              const plusHint = document.createElement('span');
              plusHint.className = 'opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-bold text-blue-500 px-1 rounded hover:bg-blue-100 shrink-0';
              plusHint.textContent = '+';
              topRow.appendChild(plusHint);
            }

            cell.appendChild(topRow);

            const pillsContainer = document.createElement('div');
            pillsContainer.className = 'mt-1.5 flex flex-col gap-1 min-w-0';

            validDayDrivers.forEach(driverId => {
              const drv = getDriverById(driverId);
              if (!drv) return;
              const theme = COLOR_THEMES[drv.color] || COLOR_THEMES.blue;

              const pill = document.createElement('div');
              pill.className = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold truncate max-w-full shadow-2xs transition-transform';
              pill.style.backgroundColor = isCurrentMonth ? theme.pillBg : '#f1f5f9';
              pill.style.color = isCurrentMonth ? theme.pillText : '#94a3b8';

              const dot = document.createElement('span');
              dot.className = 'w-2 h-2 rounded-full shrink-0';
              dot.style.backgroundColor = isCurrentMonth ? theme.dot : '#cbd5e1';

              const nameSpan = document.createElement('span');
              nameSpan.className = 'truncate';
              nameSpan.textContent = drv.name;

              pill.appendChild(dot);
              pill.appendChild(nameSpan);
              pillsContainer.appendChild(pill);
            });

            cell.appendChild(pillsContainer);

            if (!isWeekend) {
              cell.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!isCurrentMonth) {
                  viewYear = cellYear;
                  viewMonth = cellMonth;
                  renderAll();
                  setTimeout(() => openDayPopover(dateKey), 30);
                } else {
                  openDayPopover(dateKey);
                }
              });
            }

            desktopGrid.appendChild(cell);
          }
        }

        // 2. RENDER MOBILE AGENDA / LIST VIEW (Working Days Only)
        const mobileList = document.getElementById('calendar-list-mobile');
        const mobileCountBadge = document.getElementById('mobile-count-badge');
        if (mobileList) {
          mobileList.innerHTML = '';
          const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
          let workingDaysCount = 0;

          for (let d = 1; d <= daysInMonth; d++) {
            const cellDate = new Date(viewYear, viewMonth, d);
            const dow = cellDate.getDay();
            const isWeekend = (dow === 0 || dow === 6);
            if (isWeekend) continue;

            workingDaysCount++;
            const dateKey = formatDateKey(cellDate);
            const usHolidayName = holidayMap[dateKey] || null;
            const isToday = (dateKey === todayKey);

            const rawDayDrivers = Array.isArray(commuteLogs[dateKey]) ? commuteLogs[dateKey] : [];
            const validDayDrivers = rawDayDrivers.filter(id => Boolean(getDriverById(id))).slice(0, 1);

            const item = document.createElement('div');
            item.className = `flex items-center justify-between gap-2.5 p-2.5 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] ${
              isToday
                ? 'bg-blue-50/80 border-blue-300 shadow-xs'
                : usHolidayName
                ? 'bg-amber-50/70 border-amber-200/90'
                : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs'
            }`;

            const leftCol = document.createElement('div');
            leftCol.className = 'flex items-center gap-2.5 flex-1 min-w-0';

            leftCol.innerHTML = `
              <div class="w-11 h-11 rounded-xl ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#e7effb] text-[#1e3a8a]'} flex flex-col items-center justify-center shrink-0 font-bold select-none">
                <span class="text-sm font-extrabold leading-none">${d}</span>
                <span class="text-[9px] uppercase tracking-wider opacity-85 mt-0.5">${WEEKDAYS_MK[dow].slice(0, 3)}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-1.5">
                  <p class="text-[13px] font-bold text-slate-900 leading-snug">${d} ${MONTHS_MK[viewMonth]}</p>
                  ${isToday ? '<span class="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-extrabold leading-none">Денес</span>' : ''}
                </div>
                ${usHolidayName ? `
                  <p class="text-[11px] font-semibold text-amber-800 mt-0.5 leading-snug">🇺🇸 ${escapeHtml(usHolidayName)}</p>
                ` : `
                  <p class="text-[11px] font-medium text-slate-500 mt-0.5 leading-snug">${WEEKDAYS_MK[dow]}</p>
                `}
              </div>
            `;

            const rightCol = document.createElement('div');
            rightCol.className = 'flex items-center shrink-0';

            if (validDayDrivers.length > 0) {
              const drv = getDriverById(validDayDrivers[0]);
              if (drv) {
                const theme = COLOR_THEMES[drv.color] || COLOR_THEMES.blue;
                rightCol.innerHTML = `
                  <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-2xs whitespace-nowrap" style="background-color:${theme.pillBg}; color:${theme.pillText}">
                    <span class="w-2 h-2 rounded-full shrink-0" style="background-color:${theme.dot}"></span>
                    <span>${escapeHtml(drv.name)}</span>
                  </div>
                `;
              }
            } else {
              rightCol.innerHTML = `
                <span class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50/90 hover:bg-blue-100 px-3 py-1.5 rounded-full border border-blue-200/70 whitespace-nowrap">
                  <span>+ Избери</span>
                </span>
              `;
            }

            item.appendChild(leftCol);
            item.appendChild(rightCol);

            item.addEventListener('click', (e) => {
              e.stopPropagation();
              openDayPopover(dateKey);
            });

            mobileList.appendChild(item);
          }

          if (mobileCountBadge) mobileCountBadge.textContent = `${workingDaysCount} работни денови`;
        }

        renderSummaryCards(monthCounts);
      }

      function renderSummaryCards(monthCounts) {
        const container = document.getElementById('summary-cards');
        if (!container) return;
        container.innerHTML = '';

        let minCount = Infinity;
        drivers.forEach(d => {
          const c = monthCounts[d.id] || 0;
          if (c < minCount) minCount = c;
        });

        drivers.forEach(driver => {
          const theme = COLOR_THEMES[driver.color] || COLOR_THEMES.blue;
          const count = monthCounts[driver.id] || 0;
          const isNextUp = drivers.length > 1 && count === minCount;

          const card = document.createElement('div');
          card.className = 'relative rounded-2xl p-2.5 sm:p-3.5 shadow-card border border-white/90 flex items-center justify-between gap-1.5 overflow-hidden transition-all duration-200 hover:-translate-y-0.5';
          card.style.background = theme.cardBg;
          card.style.borderLeft = `4px solid ${theme.cardBorder}`;

          card.innerHTML = `
            <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/85 shadow-2xs flex items-center justify-center shrink-0" style="color:${theme.iconColor}">
                <svg class="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/>
                  <circle cx="7.5" cy="14.5" r="1.5"/>
                  <circle cx="16.5" cy="14.5" r="1.5"/>
                </svg>
              </div>
              <div class="min-w-0">
                <p class="text-[11px] sm:text-xs font-bold text-slate-600 truncate">${escapeHtml(driver.name)}</p>
                <div class="flex items-baseline gap-1 mt-0.5">
                  <span class="text-lg sm:text-2xl font-extrabold text-slate-900 leading-none">${count}</span>
                  <span class="text-[10px] sm:text-xs font-semibold text-slate-500">${count === 1 ? 'пат' : 'пати'}</span>
                </div>
              </div>
            </div>
            ${isNextUp ? `
              <span class="px-1.5 py-0.5 rounded-lg text-[9px] font-bold shrink-0" style="background-color:${theme.badgeBg}; color:${theme.badgeText}">
                Следен
              </span>
            ` : ''}
          `;

          container.appendChild(card);
        });
      }

      function renderModalDriversList() {
        const listEl = document.getElementById('modal-drivers-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        drivers.forEach((driver, idx) => {
          const theme = COLOR_THEMES[driver.color] || COLOR_THEMES.blue;
          const row = document.createElement('div');
          row.className = 'flex items-center gap-1.5 sm:gap-2 p-2 rounded-2xl bg-slate-50/90 border border-slate-200/70 min-w-0';

          const colorOptions = [
            ['blue', 'Сина'],
            ['emerald', 'Зелена'],
            ['amber', 'Портокалова'],
            ['purple', 'Виолетова'],
            ['rose', 'Црвена'],
            ['cyan', 'Тиркизна']
          ].map(([val, label]) => `<option value="${val}" ${driver.color === val ? 'selected' : ''}>${label}</option>`).join('');

          row.innerHTML = `
            <span class="w-3 h-3 rounded-full shrink-0 ml-0.5" style="background-color:${theme.dot}"></span>
            <input type="text" maxlength="18" value="${escapeHtml(driver.name)}" data-idx="${idx}"
              class="driver-name-input flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500" />
            <select data-idx="${idx}"
              class="driver-color-select w-24 sm:w-32 shrink-0 px-2 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer">
              ${colorOptions}
            </select>
            <button type="button" data-idx="${idx}" title="Отстрани"
              class="driver-delete-btn w-7 h-7 sm:w-8 sm:h-8 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center shrink-0 transition cursor-pointer ${drivers.length <= 1 ? 'opacity-30 pointer-events-none' : ''}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          `;
          listEl.appendChild(row);
        });

        listEl.querySelectorAll('.driver-name-input').forEach(inp => {
          inp.addEventListener('input', (e) => {
            const i = Number(e.target.dataset.idx);
            const val = e.target.value.trim();
            if (val && drivers[i]) drivers[i].name = val;
          });
        });

        listEl.querySelectorAll('.driver-color-select').forEach(sel => {
          sel.addEventListener('change', (e) => {
            const i = Number(e.target.dataset.idx);
            if (drivers[i]) {
              drivers[i].color = e.target.value;
              renderModalDriversList();
            }
          });
        });

        listEl.querySelectorAll('.driver-delete-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            if (drivers.length <= 1) return;
            const i = Number(btn.dataset.idx);
            drivers.splice(i, 1);
            renderModalDriversList();
          });
        });
      }

      document.getElementById('btn-prev-month').addEventListener('click', () => {
        closeDayPopover();
        viewMonth--;
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        renderAll();
      });

      document.getElementById('btn-next-month').addEventListener('click', () => {
        closeDayPopover();
        viewMonth++;
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        renderAll();
      });

      document.getElementById('btn-today').addEventListener('click', () => {
        closeDayPopover();
        const now = getRealLocalNow();
        viewYear = now.getFullYear();
        viewMonth = now.getMonth();
        renderAll();
      });

      document.getElementById('btn-clear-month').addEventListener('click', () => {
        closeDayPopover();
        const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`;
        Object.keys(commuteLogs).forEach(k => { if (k.startsWith(prefix)) delete commuteLogs[k]; });
        saveLogs();
        renderAll();
        showToast(`Исчистени записи за ${MONTHS_MK[viewMonth]} ${viewYear}`);
      });

      document.getElementById('btn-close-popover').addEventListener('click', closeDayPopover);
      document.getElementById('btn-done-popover').addEventListener('click', closeDayPopover);
      const popoverBackdrop = document.getElementById('day-popover-backdrop');
      if (popoverBackdrop) {
        popoverBackdrop.addEventListener('click', (e) => {
          if (e.target === popoverBackdrop) closeDayPopover();
        });
      }

      document.getElementById('btn-clear-day').addEventListener('click', () => {
        if (!activePopoverDateKey) return;
        delete commuteLogs[activePopoverDateKey];
        saveLogs();
        renderPopoverDrivers();
        renderAll();
      });

      window.addEventListener('resize', () => {
        if (activePopoverDateKey) closeDayPopover();
      });

      const driversModal = document.getElementById('drivers-modal');
      document.getElementById('btn-manage-drivers').addEventListener('click', () => {
        closeDayPopover();
        renderModalDriversList();
        driversModal.classList.remove('hidden');
      });

      const closeModalAndSave = () => {
        saveDrivers();
        driversModal.classList.add('hidden');
        renderAll();
      };

      document.getElementById('btn-close-modal').addEventListener('click', closeModalAndSave);
      document.getElementById('btn-save-modal').addEventListener('click', () => {
        closeModalAndSave();
        showToast('Промените се зачувани');
      });

      driversModal.addEventListener('click', (e) => {
        if (e.target === driversModal) closeModalAndSave();
      });

      document.getElementById('form-add-driver').addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('input-new-driver');
        const colorSelect = document.getElementById('select-new-color');
        const name = nameInput.value.trim();
        if (!name) return;
        const id = 'drv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        drivers.push({ id, name, color: colorSelect.value || 'blue' });
        nameInput.value = '';
        saveDrivers();
        renderModalDriversList();
        renderAll();
      });

      document.getElementById('btn-reset-defaults').addEventListener('click', () => {
        drivers = JSON.parse(JSON.stringify(DEFAULT_DRIVERS));
        saveDrivers();
        renderModalDriversList();
        renderAll();
        showToast('Вратени се почетните колеги');
      });

      // Export & Import JSON backup for localStorage
      document.getElementById('btn-export-data').addEventListener('click', () => {
        try {
          const payload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            drivers,
            commuteLogs
          };
          const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `vozacki-dnevnik-backup-${formatDateKey(new Date())}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('Бекапот е преземен');
        } catch (e) {
          showToast('Грешка при преземање бекап');
        }
      });

      document.getElementById('input-import-data').addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const parsed = JSON.parse(ev.target.result);
            if (Array.isArray(parsed.drivers) && parsed.drivers.length > 0) {
              drivers = parsed.drivers;
              saveDrivers();
            }
            if (parsed.commuteLogs && typeof parsed.commuteLogs === 'object') {
              commuteLogs = parsed.commuteLogs;
              saveLogs();
            }
            renderModalDriversList();
            renderAll();
            showToast('Податоците се успешно вчитани');
          } catch (err) {
            showToast('Невалиден JSON бекап фајл');
          }
          e.target.value = '';
        };
        reader.readAsText(file);
      });

      let lastKnownMonthKey = `${realToday.getFullYear()}-${realToday.getMonth()}`;
      setInterval(() => {
        const now = getRealLocalNow();
        const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
        if (currentMonthKey !== lastKnownMonthKey) {
          lastKnownMonthKey = currentMonthKey;
          viewYear = now.getFullYear();
          viewMonth = now.getMonth();
          renderAll();
        }
      }, 60000);

      function initOfflineSupport() {
        const badge = document.getElementById('offline-status-badge');
        const dot = document.getElementById('offline-status-dot');
        const text = document.getElementById('offline-status-text');

        function updateConnectionUI() {
          if (!badge || !dot || !text) return;
          if (navigator.onLine) {
            badge.className = 'hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-50/90 text-emerald-700 border border-emerald-200/80 select-none';
            dot.className = 'w-2 h-2 rounded-full bg-emerald-500';
            text.textContent = isLocalStoragePersistent ? 'Локално зачувано' : 'Мемориски режим';
          } else {
            badge.className = 'hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-amber-50/90 text-amber-800 border border-amber-200/80 select-none';
            dot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
            text.textContent = 'Офлајн режим (Локално)';
          }
        }

        updateConnectionUI();
        window.addEventListener('online', () => {
          updateConnectionUI();
          showToast('Повторно сте онлајн');
        });
        window.addEventListener('offline', () => {
          updateConnectionUI();
          showToast('Офлајн режим — промените се чуваат локално');
        });

        // Multi-tab localStorage sync
        window.addEventListener('storage', (e) => {
          if (e.key === STORAGE_KEYS.DRIVERS || e.key === STORAGE_KEYS.LOGS) {
            drivers = loadDrivers();
            commuteLogs = loadLogs();
            renderAll();
          }
        });

        // Register the standalone service worker (required for a reliable installable PWA).
        if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
          navigator.serviceWorker.register('./sw.js').catch((err) => {
            console.warn('Service worker registration failed:', err);
          });
        }
      }

      // Native PWA installation prompt (Chromium browsers). iOS users can use Share > Add to Home Screen.
      let deferredInstallPrompt = null;
      const installButton = document.getElementById('btn-install');
      window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        if (installButton) installButton.hidden = false;
      });
      if (installButton) {
        installButton.addEventListener('click', async () => {
          if (!deferredInstallPrompt) return;
          deferredInstallPrompt.prompt();
          await deferredInstallPrompt.userChoice;
          deferredInstallPrompt = null;
          installButton.hidden = true;
        });
      }
      window.addEventListener('appinstalled', () => {
        if (installButton) installButton.hidden = true;
        showToast('Апликацијата е инсталирана');
      });

      initOfflineSupport();
      renderAll();
    })();
