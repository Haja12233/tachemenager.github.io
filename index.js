// index.js (COMPLET avec fonctionnalité Pause/Verrouillage)
// Ce code est destiné à être exécuté après le chargement complet du DOM.

// --- VARIABLES ET CONFIGURATION GLOBALES ---
const initialUsers = ['Anniva', 'Tina'];
let initialLocales = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'];
let defaultUser = null, defaultUserExpiry = null;
const requiredCells = ['a1', 'a2', 'a3', 'c2', 'c3', 'd1'];
let activeMenu = null;
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz7NrE1iwl4vthz2Sxx3DIOoRXrSkq8nolvjefXo-w-KdBaP948MGa19hRanVgR5EQK/exec';

// Variables pour le suivi des tâches
let taskHistory = [];
let currentTaskIndex = 0;
let selectedLocale = null;
let startTime = null;

// Nouvelles variables pour la gestion du temps
let taskStartTime = null;
let taskPauseTime = null;
let taskEndTime = null;
let isTaskPaused = false;
let previousTaskEndTime = null;

// Stockage pour les résultats à afficher dans le tableau
let displayedTaskResults = [];

// --- FONCTIONS UTILITAIRES ---
function createDropdownItem(text) {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    const span = document.createElement('span');
    span.className = 'dropdown-item-content';
    span.textContent = text;
    item.appendChild(span);
    return item;
}

function createDropdownButtonItem(text, id) {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.id = id;
    item.style.fontWeight = 'bold';
    item.style.cursor = 'pointer';
    const span = document.createElement('span');
    span.className = 'dropdown-item-content';
    span.textContent = text;
    item.appendChild(span);
    return item;
}

function showNotification(message, isCompletion = false) {
    const notification = document.getElementById('notification-banner');
    if (notification) {
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            if (isCompletion) resetAll();
        }, 2000);
    }
}

function updateCurrentDate() {
    const dateElement = document.getElementById('current-date-display');
    if (dateElement) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = now.toLocaleDateString('fr-FR', options);
    }
}

// --- FONCTIONS DE GESTION DES DONNÉES (LocalStorage) ---
function saveResults() {
    const results = {};
    const cellsToSave = ['a1', 'a2', 'a3', 'a4', 'b4', 'c2', 'c3', 'c4', 'd1', 'd4'];
    cellsToSave.forEach(id => {
        const cell = document.getElementById(id);
        if (!cell) return;
        const contentSpan = cell.querySelector('.cell-content');
        const contentButton = cell.querySelector('button:not(.choice-button)');
        let currentValue = '', color = '';
        if (id === 'c2') {
            const locationList = cell.querySelector('.location-list');
            const contentSpanC2 = cell.querySelector('.cell-content');
            if (locationList) {
                const locationsWithColor = Array.from(locationList.querySelectorAll('.location-item')).map(item => {
                    let c = 'none';
                    if (item.classList.contains('text-green-c2')) c = 'green';
                    if (item.classList.contains('text-red-c2')) c = 'red';
                    return { text: item.textContent.trim(), color: c };
                });
                currentValue = JSON.stringify(locationsWithColor);
            } else if (contentSpanC2) {
                currentValue = contentSpanC2.textContent.trim();
            } else {
                currentValue = '';
            }
        } else if (contentSpan) {
            currentValue = contentSpan.textContent.trim();
            if (cell.classList.contains('text-red')) color = 'red';
        } else if (contentButton) {
            currentValue = contentButton.textContent.trim();
        }
        const initialText = cell.getAttribute('data-initial-text');
        // Sauvegarder si une valeur existe et est différente du texte initial
        // OU si c'est une cellule optionnelle (car "Vide" est leur état)
        if (currentValue && (currentValue !== initialText || ['a4', 'b4', 'c4', 'd4'].includes(id))) {
            results[id] = { value: currentValue, color: color };
        }
    });
    localStorage.setItem('taskResults', JSON.stringify(results));
}

function loadResults() {
    const savedResults = localStorage.getItem('taskResults');
    // Initialiser les cellules optionnelles avec "Vide"
    const optionalCells = ['a4', 'b4', 'c4', 'd4'];
    optionalCells.forEach(id => {
        const cell = document.getElementById(id);
        if (cell) {
            const contentSpan = cell.querySelector('.cell-content');
            if (contentSpan) {
                contentSpan.textContent = 'Vide';
                contentSpan.classList.remove('placeholder');
            }
        }
    });

    if (savedResults) {
        const results = JSON.parse(savedResults);
        for (const id in results) {
            const cell = document.getElementById(id);
            if (!cell) continue;
            if (id === 'c2') {
                const value = results[id].value;
                try {
                    const locationsWithColor = JSON.parse(value);
                    if (Array.isArray(locationsWithColor)) {
                        showC2LocationList(locationsWithColor);
                        const container = cell.querySelector('.location-list');
                        if (container) {
                            container.innerHTML = '';
                            locationsWithColor.forEach(loc => {
                                const locationItem = document.createElement('div');
                                locationItem.className = 'location-item';
                                locationItem.textContent = loc.text;
                                if (loc.color === 'green') {
                                    locationItem.classList.add('text-green-c2');
                                    locationItem.dataset.colorState = '1';
                                } else if (loc.color === 'red') {
                                    locationItem.classList.add('text-red-c2');
                                    locationItem.dataset.colorState = '2';
                                } else {
                                    locationItem.dataset.colorState = '0';
                                }
                                container.appendChild(locationItem);
                            });
                        }
                    } else {
                        condenseC2(value);
                    }
                } catch (e) {
                    const contentSpan = document.createElement('span');
                    contentSpan.className = 'cell-content';
                    contentSpan.textContent = value;
                    cell.innerHTML = '';
                    cell.appendChild(contentSpan);
                }
            } else {
                const contentSpan = cell.querySelector('.cell-content');
                const contentButton = cell.querySelector('button');
                if (contentSpan) {
                    contentSpan.textContent = results[id].value;
                    contentSpan.classList.remove('placeholder');
                    cell.classList.remove('required-yellow', 'text-green', 'text-red');
                    if (results[id].color === 'red') cell.classList.add('text-red');
                    const initialText = cell.getAttribute('data-initial-text');
                    if (results[id].value && results[id].value !== initialText) {
                        cell.classList.remove('required-yellow');
                    }
                } else if (contentButton) {
                    contentButton.textContent = results[id].value;
                }
            }
        }
    }
}

function saveTaskHistory() {
    localStorage.setItem('taskHistory', JSON.stringify(taskHistory));
    localStorage.setItem('currentTaskIndex', currentTaskIndex.toString());
    localStorage.setItem('displayedTaskResults', JSON.stringify(displayedTaskResults));
}

function loadTaskHistory() {
    const savedHistory = localStorage.getItem('taskHistory');
    const savedIndex = localStorage.getItem('currentTaskIndex');
    const savedDisplayedResults = localStorage.getItem('displayedTaskResults');
    if (savedHistory) taskHistory = JSON.parse(savedHistory);
    if (savedIndex) currentTaskIndex = parseInt(savedIndex);
    if (savedDisplayedResults) {
        displayedTaskResults = JSON.parse(savedDisplayedResults);
        renderTaskResultsTable();
    }
}

function saveDefaultUser() {
    if (defaultUser) {
        localStorage.setItem('defaultUserD1', JSON.stringify({
            user: defaultUser,
            expiry: defaultUserExpiry
        }));
    }
}

function loadDefaultUser() {
    const defaultUserData = localStorage.getItem('defaultUserD1');
    if (defaultUserData) {
        const userData = JSON.parse(defaultUserData);
        if (userData.expiry > Date.now()) {
            defaultUser = userData.user;
            defaultUserExpiry = userData.expiry;
            const cell = document.getElementById('d1');
            const contentSpan = cell?.querySelector('.cell-content');
            if (contentSpan) {
                contentSpan.textContent = defaultUser;
                contentSpan.classList.remove('placeholder');
                contentSpan.classList.add('default-user');
                cell.classList.remove('required-yellow');
                cell.classList.add('default-user-active');
                // Ajout de la classe pour le fond vert
                cell.classList.add('user-locale-selected');
            }
            updateD1MenuWithDefault();
        } else {
            localStorage.removeItem('defaultUserD1');
        }
    }
}

// --- FONCTIONS DE GESTION DES CELLULES ---
function resetAllExceptA1D1A3() {
    const cellsToReset = ['a2', 'a4', 'b4', 'c2', 'c3', 'c4', 'd4'];
    cellsToReset.forEach(id => {
        const cell = document.getElementById(id);
        if (!cell) return;
        if (id === 'c2') {
            showC2Buttons();
        } else {
            const initialText = cell.getAttribute('data-initial-text');
            const contentSpan = cell.querySelector('.cell-content');
            if (contentSpan) {
                contentSpan.textContent = initialText;
                contentSpan.classList.add('placeholder');
                contentSpan.classList.remove('default-user');
            }
        }
        cell.classList.remove('text-green', 'text-red', 'default-user-active', 'c2-condensed-green', 'c2-condensed-red');
        if (['c2', 'c3'].includes(id)) {
            cell.classList.add('required-yellow');
        }
        cell.dataset.colorState = '0';
    });
    localStorage.removeItem('taskResults');
    updateResults();
}

function manualRefresh() {
    const cellsToReset = ['a1', 'a2', 'a4', 'b4', 'c2', 'c3', 'c4', 'd1', 'd4'];
    cellsToReset.forEach(id => {
        const cell = document.getElementById(id);
        if (!cell) return;
        if (id === 'c2') {
            showC2Buttons();
        } else {
            const initialText = cell.getAttribute('data-initial-text');
            const contentSpan = cell.querySelector('.cell-content');
            if (contentSpan) {
                 if (['a4', 'b4', 'c4', 'd4'].includes(id)) {
                     contentSpan.textContent = 'Vide';
                     contentSpan.classList.remove('placeholder');
                 } else {
                     contentSpan.textContent = initialText;
                     contentSpan.classList.add('placeholder');
                     contentSpan.classList.remove('default-user');
                 }
            }
        }
        cell.classList.remove('text-green', 'text-red', 'default-user-active', 'c2-condensed-green', 'c2-condensed-red', 'user-locale-selected');
        if (['a1', 'c2', 'c3', 'd1'].includes(id)) {
            cell.classList.add('required-yellow');
        }
        cell.dataset.colorState = '0';
    });
    localStorage.removeItem('taskResults');
    defaultUser = null;
    defaultUserExpiry = null;
    localStorage.removeItem('defaultUserD1');
    updateA1Menu();
    updateD1MenuWithDefault();
    showNotification('Toutes les cases ont été réinitialisées ! 🔄');
}

function checkCompletion() {
    for (const id of requiredCells) {
        const cell = document.getElementById(id);
        if (!cell) return false;
        if (id === 'c2') {
            const contentSpan = cell.querySelector('.cell-content');
            if (!contentSpan || !contentSpan.textContent.trim().match(/^[0-9]+R$|^xR$/)) {
                return false;
            }
        } else if (id === 'a3') {
             // Vérifier que A3 n'est pas dans son état initial/placeholder
             const contentSpan = cell.querySelector('.cell-content');
             const initialText = cell.getAttribute('data-initial-text');
             if (!contentSpan || contentSpan.textContent.trim() === initialText || contentSpan.classList.contains('placeholder')) {
                 return false; // A3 doit avoir été modifié (ex: "Fin" affiché)
             }
        } else {
            const initialText = cell.getAttribute('data-initial-text');
            const contentSpan = cell.querySelector('.cell-content');
            const contentButton = cell.querySelector('button');
            let currentValue = contentSpan ? contentSpan.textContent.trim() : (contentButton ? contentButton.textContent.trim() : '');
            if (!currentValue || currentValue === initialText) return false;
        }
    }
    return true;
}

// --- FONCTIONS POUR LA CELLULE D1 (Utilisateur) ---
function setDefaultUser(name) {
    defaultUser = name;
    defaultUserExpiry = Date.now() + 28800000;
    const cell = document.getElementById('d1');
    const contentSpan = cell?.querySelector('.cell-content');
    if (contentSpan) {
        contentSpan.textContent = defaultUser;
        contentSpan.classList.remove('placeholder');
        contentSpan.classList.add('default-user');
        cell.classList.remove('required-yellow');
        cell.classList.add('default-user-active');
        // Ajout de la classe pour le fond vert
        cell.classList.add('user-locale-selected');
    }
    saveDefaultUser();
    updateD1MenuWithDefault();
    showNotification(`Utilisateur "${defaultUser}" défini par défaut pour 8h !`);
}

function updateD1MenuWithDefault() {
    const menu = document.querySelector('#d1 .dropdown-menu');
    if (menu) {
        menu.innerHTML = '';
        if (defaultUser) {
            const defaultItem = createDropdownItem(`★ ${defaultUser} (par défaut)`);
            defaultItem.classList.add('default-user-item');
            menu.appendChild(defaultItem);
        }
        initialUsers.forEach(user => {
            if (user !== defaultUser) {
                menu.appendChild(createDropdownItem(user));
            }
        });
        const addItem = createDropdownItem('+');
        addItem.classList.add('add-item');
        menu.appendChild(addItem);
    }
}

// --- FONCTIONS POUR LA CELLULE A1 (Locale) ---
function updateA1Menu() {
    const menu = document.querySelector('#a1 .dropdown-menu');
    if (menu) {
        menu.innerHTML = '';
        initialLocales.forEach(locale => {
            menu.appendChild(createDropdownItem(locale));
        });

        // Ajouter un séparateur visuel
        const separator = document.createElement('div');
        separator.className = 'dropdown-item-separator';
        separator.style.borderTop = '1px solid var(--border-color)';
        separator.style.margin = '4px 0';
        menu.appendChild(separator);

        // Vérifier si C2 et C3 ont des valeurs pour activer le bouton PAUSE
        const c2Cell = document.getElementById('c2');
        const c3Cell = document.getElementById('c3');
        const c2HasValue = c2Cell && !c2Cell.querySelector('.cell-content')?.classList.contains('placeholder');
        const c3HasValue = c3Cell && parseInt(c3Cell.dataset.colorState || 0) > 0;

        // Créer et ajouter le bouton PAUSE/REPRENDRE seulement si C2 et C3 ont des valeurs
        if (c2HasValue && c3HasValue) {
            const pauseItem = createDropdownButtonItem(isTaskPaused ? '⏯️ REPRENDRE' : '⏸️ PAUSE', 'dropdown-pause-btn-a1');
            if (isTaskPaused) {
                pauseItem.style.backgroundColor = 'var(--required-color)';
            }
            menu.appendChild(pauseItem);
        }

        // Créer et ajouter le bouton FIN
        const finItem = createDropdownButtonItem('⏹️ FIN', 'dropdown-fin-btn-a1');
        finItem.style.color = 'var(--success-color)';
        menu.appendChild(finItem);
    }
}

function showA1Buttons() {
    updateA1Menu();
    const oldButtonContainer = document.getElementById('a1')?.querySelector('.action-buttons');
    if (oldButtonContainer) {
        oldButtonContainer.style.display = 'none';
    }
}

// --- FONCTION POUR LE BOUTON PAUSE/REPRENDRE ---
function togglePauseResume() {
    const cellsToLock = ['a2', 'a3', 'a4', 'b4', 'c2', 'c3', 'c4', 'd1', 'd4'];
    
    if (!isTaskPaused) {
        // Mettre en pause - verrouiller les cellules
        isTaskPaused = true;
        cellsToLock.forEach(id => {
            const cell = document.getElementById(id);
            if (cell) {
                cell.classList.add('cell-locked');
            }
        });
        showNotification('Tâche mise en pause ⏸️ - Cellules verrouillées');
    } else {
        // Reprendre - déverrouiller les cellules
        isTaskPaused = false;
        cellsToLock.forEach(id => {
            const cell = document.getElementById(id);
            if (cell) {
                cell.classList.remove('cell-locked');
            }
        });
        showNotification('Tâche reprise ! ▶️');
    }
    
    // Mettre à jour le menu A1 pour refléter le nouvel état
    updateA1Menu();
}

// --- FONCTIONS POUR LA CELLULE C2 ---
function showC2Buttons() {
    const cell = document.getElementById('c2');
    if (cell) {
        cell.innerHTML = `<span class="cell-content placeholder-text">Sélectionnez Locale</span>`;
        cell.classList.remove('c2-condensed-green', 'c2-condensed-red');
        cell.classList.add('required-yellow');
    }
}

function showC2LocationList(locationsWithColor) {
    const c2Cell = document.getElementById('c2');
    if (c2Cell) {
        c2Cell.innerHTML = `
            <div class="location-container">
                <div class="location-list"></div>
                <div class="list-add-button" id="add-locale-c2">+</div>
            </div>`;
        c2Cell.classList.remove('c2-condensed-green', 'c2-condensed-red');
        c2Cell.classList.add('required-yellow');
        const container = c2Cell.querySelector('.location-list');
        if (container && locationsWithColor) {
            locationsWithColor.forEach(loc => {
                const locationItem = document.createElement('div');
                locationItem.className = 'location-item';
                locationItem.textContent = loc.text;
                if (loc.color === 'green') {
                    locationItem.classList.add('text-green-c2');
                    locationItem.dataset.colorState = '1';
                } else if (loc.color === 'red') {
                    locationItem.classList.add('text-red-c2');
                    locationItem.dataset.colorState = '2';
                } else {
                    locationItem.dataset.colorState = '0';
                }
                container.appendChild(locationItem);
            });
        }
        const addButton = c2Cell.querySelector('#add-locale-c2');
        if (addButton) {
            addButton.addEventListener('click', function (e) {
                e.stopPropagation();
                handleListAdd(c2Cell);
            });
        }
    }
}

function loadControlLocationsForLocale(locale, useSavedData = false) {
    const c2Cell = document.getElementById('c2');
    if (!c2Cell) return;
    c2Cell.innerHTML = `<span class="cell-content">Chargement...</span>`;
    if (useSavedData) {
        const savedResults = localStorage.getItem('taskResults');
        if (savedResults) {
            try {
                const results = JSON.parse(savedResults);
                if (results['c2'] && results['c2'].value) {
                    const locationsWithColor = JSON.parse(results['c2'].value);
                    if (Array.isArray(locationsWithColor)) {
                        showC2LocationList(locationsWithColor);
                        return;
                    }
                }
            } catch (e) {
                console.error("Erreur lors du chargement des données sauvegardées:", e);
            }
        }
    }
    const url = `${SCRIPT_URL}?locale=${encodeURIComponent(locale)}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const locations = (data.success && data.data) ? data.data : [];
            if (locale === 'P1') {
                const defaultLocations = ['Chambre', 'Terrasse'];
                defaultLocations.forEach(loc => {
                    if (!locations.includes(loc)) {
                        locations.push(loc);
                    }
                });
            }
            if (locations.length > 0) {
                const locationsWithColor = locations.map(loc => ({ text: loc, color: 'none' }));
                showC2LocationList(locationsWithColor);
            } else {
                condenseC2('R');
            }
        })
        .catch(error => {
            console.error('Erreur lors du chargement des lieux de contrôle:', error);
            condenseC2('Erreur');
        });
}

function condenseC2(value) {
    const c2Cell = document.getElementById('c2');
    if (c2Cell) {
        c2Cell.innerHTML = `<span class="cell-content">${value}</span>`;
        c2Cell.classList.remove('required-yellow');
        if (value.endsWith('R')) {
            const redCount = parseInt(value.slice(0, -1));
            if (redCount > 0) {
                c2Cell.classList.add('c2-condensed-red');
            } else {
                c2Cell.classList.add('c2-condensed-green');
            }
        } else {
            c2Cell.classList.add('c2-condensed-green');
        }
    }
}

// --- FONCTIONS POUR LES CELLULES A4, B4, C4, D4 ---
function updateA4Menu() {
    const menu = document.querySelector('#a4 .dropdown-menu');
    if (menu) {
        menu.innerHTML = '';
        const items = ["Vide", "01", "02", "10", "11", "12", "20", "21", "11"];
        items.forEach(itemText => {
            menu.appendChild(createDropdownItem(itemText));
        });
    }
}

function updateB4Menu() {
    const menu = document.querySelector('#b4 .dropdown-menu');
    if (menu) {
        menu.innerHTML = '';
        const items = ["Vide", "1", "2", "3"];
        items.forEach(itemText => {
            menu.appendChild(createDropdownItem(itemText));
        });
    }
}

function updateC4Menu() {
    const menu = document.querySelector('#c4 .dropdown-menu');
    if (menu) {
        menu.innerHTML = '';
        const items = ["Vide", "1", "2", "3"];
        items.forEach(itemText => {
            menu.appendChild(createDropdownItem(itemText));
        });
    }
}

function updateD4Menu() {
    const menu = document.querySelector('#d4 .dropdown-menu');
    if (menu) {
        menu.innerHTML = '';
        const items = ["Vide", "1", "2", "3", "4", "5"];
        items.forEach(itemText => {
            menu.appendChild(createDropdownItem(itemText));
        });
    }
}

// --- FONCTIONS DE TRAITEMENT DES RÉSULTATS ET TABLEAU ---
function addToDisplayedResults(taskData) {
    const pavillon = taskData.locale || '';
    const debut = taskData.startTimeFormatted || '';
    const fin = taskData.endTimeFormatted || '';
    const utilisateur = taskData.user || '';

    const isDuplicate = displayedTaskResults.some(result => result.pavillon === pavillon);
    const isInInitialList = initialLocales.includes(pavillon);
    if (isDuplicate || !isInInitialList) {
        if (isDuplicate) {
            alert(`Le pavillon ${pavillon} a déjà été enregistré.`);
        } else {
            alert(`Le pavillon ${pavillon} n'est pas dans la liste des pavillons valides.`);
        }
        return;
    }

    const getCellValue = (id) => {
        const cell = document.getElementById(id);
        if (!cell) return '';
        const contentSpan = cell.querySelector('.cell-content');
        if (contentSpan) {
            return contentSpan.textContent.trim();
        }
        const contentButton = cell.querySelector('button');
        if (contentButton) {
            return contentButton.textContent.trim();
        }
        return '';
    };

    const getCellValueOrDefault = (id) => {
        const cell = document.getElementById(id);
        if (!cell) return '';
        const contentSpan = cell.querySelector('.cell-content');
        if (contentSpan && contentSpan.classList.contains('placeholder')) {
            if (['a4', 'b4', 'c4', 'd4'].includes(id)) {
                return 'Vide';
            }
        }
        return getCellValue(id);
    };

    const a4 = getCellValueOrDefault('a4');
    const b4 = getCellValueOrDefault('b4');
    const c2Raw = getCellValue('c2');
    let c2 = '';
    const c2Cell = document.getElementById('c2');
    if (c2Cell?.querySelector('.location-list')) {
        const redCount = Array.from(c2Cell.querySelectorAll('.location-item.text-red-c2')).length;
        if (redCount > 0) {
            c2 = `${redCount}R`;
        } else {
            c2 = 'xR';
        }
    } else {
        c2 = c2Raw;
    }

    const c3Cell = document.getElementById('c3');
    const c3ContentSpan = c3Cell?.querySelector('.cell-content');
    let c3Value = '';
    let c3ColorClass = '';
    if (c3ContentSpan && c3ContentSpan.textContent.trim() === 'X') {
        c3Value = 'X';
        if (c3Cell?.classList.contains('text-green')) {
            c3ColorClass = 'text-green';
        } else if (c3Cell?.classList.contains('text-red')) {
            c3ColorClass = 'text-red';
        }
    } else {
        c3Value = c3ContentSpan ? c3ContentSpan.textContent.trim() : '';
    }

    const c4 = getCellValueOrDefault('c4');
    const d4 = getCellValueOrDefault('d4');

    const tableRowData = {
        pavillon, debut, fin, utilisateur,
        a4, b4, c2,
        c3: { value: c3Value, colorClass: c3ColorClass },
        c4, d4
    };

    displayedTaskResults.push(tableRowData);
    saveTaskHistory();
    renderTaskResultsTable();
}

function renderTaskResultsTable() {
    const container = document.getElementById('task-results-table-container');
    if (!container) return;
    if (displayedTaskResults.length === 0) {
        container.innerHTML = '<p style="margin-top: 15px; text-align: center;">Aucun résultat à afficher pour le moment.</p>';
        return;
    }
    let tableHTML = `
    <table id="task-results-table" style="width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 15px;">
        <thead><tr style="background-color: #e9ecef;">
            <th style="border: 1px solid #ddd; padding: 4px;">Pavillon</th>
            <th style="border: 1px solid #ddd; padding: 4px;">Début</th>
            <th style="border: 1px solid #ddd; padding: 4px;">Fin</th>
            <th style="border: 1px solid #ddd; padding: 4px;">Utilisateur</th>
            <th style="border: 1px solid #ddd; padding: 4px;">A4</th>
            <th style="border: 1px solid #ddd; padding: 4px;">B4</th>
            <th style="border: 1px solid #ddd; padding: 4px;">C2</th>
            <th style="border: 1px solid #ddd; padding: 4px;">C3</th>
            <th style="border: 1px solid #ddd; padding: 4px;">C4</th>
            <th style="border: 1px solid #ddd; padding: 4px;">D4</th>
        </tr></thead>
        <tbody>`;
    displayedTaskResults.forEach(row => {
        tableHTML += `<tr style="border-bottom: 1px solid #ddd;">`;
        tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.pavillon || ''}</td>`;
        tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.debut || ''}</td>`;
        tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.fin || ''}</td>`;
        tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.utilisateur || ''}</td>`;
        tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.a4 || ''}</td>`;
        tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.b4 || ''}</td>`;
        tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.c2 || ''}</td>`;
        let c3Display = '';
        if (typeof row.c3 === 'object' && row.c3.value === 'X') {
            let c3Style = '';
            if (row.c3.colorClass === 'text-green') {
                c3Style = 'color: #28a745; font-weight: bold;';
            } else if (row.c3.colorClass === 'text-red') {
                c3Style = 'color: #dc3545; font-weight: bold;';
            }
            c3Display = `<span style="${c3Style}">${row.c3.value}</span>`;
        } else {
            c3Display = typeof row.c3 === 'object' ? row.c3.value : row.c3 || '';
        }
        tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${c3Display}</td>`;
        tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.c4 || ''}</td>`;
        tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.d4 || ''}</td>`;
        tableHTML += `</tr>`;
    });
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}

// --- FONCTIONS DE GESTION DES ÉVÉNEMENTS ---
function handleA1Click(e) {
    e.stopPropagation();
    const menu = this.querySelector('.dropdown-menu');
    if (menu) {
        if (activeMenu && activeMenu !== menu) {
            activeMenu.classList.remove('show');
        }
        updateA1Menu(); // Toujours mettre à jour le menu avant de l'afficher
        menu.classList.toggle('show');
        activeMenu = menu.classList.contains('show') ? menu : null;
    }
}

function handleFinTask() {
    const c3Cell = document.getElementById('c3');
    const c3ColorState = parseInt(c3Cell?.dataset.colorState || 0);
    if (c3ColorState === 0) {
        alert("Veuillez sélectionner une valeur pour la case 'Contrôle Xylophage' (C3) avant de terminer la tâche.");
        return;
    }
    if (checkCompletion()) {
        // --- AFFICHAGE DE "Fin" DANS A3 UNIQUEMENT ---
        const a3ContentSpan = document.getElementById('a3')?.querySelector('.cell-content');
        if (a3ContentSpan) {
            a3ContentSpan.textContent = 'Fin';
            a3ContentSpan.classList.remove('placeholder');
        }
        // --- CAPTURE DE L'HEURE RÉELLE DE FIN ---
        const realFinTime = new Date();
        const realFinTimeFormatted = realFinTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        // --- RÉCUPÉRATION DE L'HEURE RÉELLE DE DÉBUT DEPUIS A2 ---
        const a2ContentSpan = document.getElementById('a2')?.querySelector('.cell-content');
        const realStartTimeFormatted = a2ContentSpan && !a2ContentSpan.classList.contains('placeholder') ? a2ContentSpan.textContent : '';

        const taskData = {
            locale: selectedLocale,
            user: document.getElementById('d1')?.querySelector('.cell-content')?.textContent,
            startTimeFormatted: realStartTimeFormatted, // Heure réelle de début
            endTimeFormatted: realFinTimeFormatted,     // Heure réelle de fin
            a4: document.getElementById('a4')?.querySelector('.cell-content')?.textContent,
            b4: document.getElementById('b4')?.querySelector('.cell-content')?.textContent,
            c2: document.getElementById('c2')?.querySelector('.cell-content')?.textContent,
            c3: c3Cell?.querySelector('.cell-content')?.textContent,
            c4: document.getElementById('c4')?.querySelector('.cell-content')?.textContent,
            d4: document.getElementById('d4')?.querySelector('.cell-content')?.textContent
        };

        addToDisplayedResults(taskData);
        sendDataToSheets(taskData);
        setTimeout(() => {
            resetAllExceptA1D1A3();
            showNotification('Tâche complète ! 🎉', true);
        }, 1000);
    } else {
        alert('Veuillez remplir toutes les cases obligatoires (jaunes) avant de finir la tâche.');
    }
}

function handleListAdd(cell) {
    const newLocation = prompt("Veuillez entrer le nom du nouveau lieu :");
    if (newLocation === null) return;
    const trimmedLocation = newLocation.trim();
    if (trimmedLocation === '') {
        alert("Le nom du lieu ne peut pas être vide.");
        return;
    }
    const existingItems = cell.querySelectorAll('.location-item');
    for (let item of existingItems) {
        if (item.textContent.trim().toLowerCase() === trimmedLocation.toLowerCase()) {
            alert(`Le lieu "${trimmedLocation}" existe déjà dans la liste.`);
            return;
        }
    }
    const locationItem = document.createElement('div');
    locationItem.className = 'location-item';
    locationItem.textContent = trimmedLocation;
    locationItem.dataset.colorState = '0';
    const list = cell.querySelector('.location-list');
    if (list) {
        list.appendChild(locationItem);
        updateResults();
    } else {
        alert("Erreur : Impossible de trouver la liste pour ajouter le lieu.");
    }
}

function savePreviousTaskState(previousLocale) {
    const pavillon = previousLocale || '';
    const debutElement = document.getElementById('a2')?.querySelector('.cell-content');
    const debut = debutElement && !debutElement.classList.contains('placeholder') ? debutElement.textContent : '';
    const finElement = document.getElementById('a3')?.querySelector('.cell-content');
    let fin = '';
    if (finElement && !finElement.classList.contains('placeholder') && finElement.textContent.trim() !== 'Fin') {
        fin = finElement.textContent;
    } else {
        fin = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    const utilisateurElement = document.getElementById('d1')?.querySelector('.cell-content');
    const utilisateur = utilisateurElement && !utilisateurElement.classList.contains('placeholder') ? utilisateurElement.textContent : '';

    const getCellValue = (id) => {
        const cell = document.getElementById(id);
        if (!cell) return '';
        const contentSpan = cell.querySelector('.cell-content');
        if (contentSpan) return contentSpan.textContent.trim();
        const contentButton = cell.querySelector('button');
        if (contentButton) return contentButton.textContent.trim();
        return '';
    };

    const getCellValueOrDefault = (id) => {
        const cell = document.getElementById(id);
        if (!cell) return '';
        const contentSpan = cell.querySelector('.cell-content');
        if (contentSpan && contentSpan.classList.contains('placeholder')) {
            if (['a4', 'b4', 'c4', 'd4'].includes(id)) {
                return 'Vide';
            }
        }
        return getCellValue(id);
    };

    const a4 = getCellValueOrDefault('a4');
    const b4 = getCellValueOrDefault('b4');
    const c2Raw = getCellValue('c2');
    let c2 = '';
    const c2Cell = document.getElementById('c2');
    if (c2Cell?.querySelector('.location-list')) {
        const redCount = Array.from(c2Cell.querySelectorAll('.location-item.text-red-c2')).length;
        if (redCount > 0) {
            c2 = `${redCount}R`;
        } else {
            c2 = 'xR';
        }
    } else {
        c2 = c2Raw;
    }

    const c3Cell = document.getElementById('c3');
    const c3ContentSpan = c3Cell?.querySelector('.cell-content');
    let c3Value = '';
    let c3ColorClass = '';
    if (c3ContentSpan && c3ContentSpan.textContent.trim() === 'X') {
        c3Value = 'X';
        if (c3Cell?.classList.contains('text-green')) {
            c3ColorClass = 'text-green';
        } else if (c3Cell?.classList.contains('text-red')) {
            c3ColorClass = 'text-red';
        }
    } else {
        if (c3ContentSpan && !c3ContentSpan.classList.contains('placeholder')) {
            c3Value = c3ContentSpan.textContent.trim();
        } else {
            c3Value = c3ContentSpan ? c3ContentSpan.textContent.trim() : 'Vide';
            if (c3ContentSpan && c3ContentSpan.classList.contains('placeholder')) {
                c3Value = 'Vide';
            }
        }
    }

    const c4 = getCellValueOrDefault('c4');
    const d4 = getCellValueOrDefault('d4');

    const isDuplicate = displayedTaskResults.some(result => result.pavillon === pavillon);
    const isInInitialList = initialLocales.includes(pavillon);
    if (isDuplicate || !isInInitialList) {
        return;
    }

    const tableRowData = {
        pavillon, debut, fin, utilisateur,
        a4, b4, c2,
        c3: { value: c3Value, colorClass: c3ColorClass },
        c4, d4
    };

    displayedTaskResults.push(tableRowData);
    saveTaskHistory();
    renderTaskResultsTable();
}

function sendDataToSheets(data) {
    const formData = new FormData();
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            formData.append(key, data[key]);
        }
    }
    fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        console.log('Données envoyées avec succès:', result);
    })
    .catch(error => {
        console.error('Erreur lors de l\'envoi des données:', error);
    });
}

function updateResults() {
    saveResults();
}

// --- INITIALISATION ET ÉCOUTEURS D'ÉVÉNEMENTS ---
document.addEventListener('DOMContentLoaded', function () {
    // Initialisation
    loadDefaultUser();
    updateA1Menu();
    updateA4Menu();
    updateB4Menu();
    updateC4Menu();
    updateD4Menu();
    loadResults();
    loadTaskHistory();

    // Écouteurs généraux pour les cellules avec menus déroulants (sauf A1 et D1)
    document.querySelectorAll('.cell').forEach(cell => {
        if (['b4', 'c4', 'a4', 'd4'].includes(cell.id)) {
            cell.addEventListener('click', function (e) {
                e.stopPropagation();
                const menu = this.querySelector('.dropdown-menu');
                if (menu) {
                    if (activeMenu && activeMenu !== menu) {
                        activeMenu.classList.remove('show');
                    }
                    menu.classList.toggle('show');
                    activeMenu = menu.classList.contains('show') ? menu : null;
                }
            });
        }
    });

    // Écouteur spécifique pour A1
    document.getElementById('a1')?.addEventListener('click', handleA1Click);

    // Écouteur spécifique pour D1
    document.getElementById('d1')?.addEventListener('click', function(e) {
        e.stopPropagation();
        const menu = this.querySelector('.dropdown-menu');
        if (menu) {
            if (activeMenu && activeMenu !== menu) {
                activeMenu.classList.remove('show');
            }
            menu.classList.toggle('show');
            activeMenu = menu.classList.contains('show') ? menu : null;
        }
    });

    // Écouteur pour le bouton Refresh
    document.getElementById('refresh-button')?.addEventListener('click', manualRefresh);

    // Gestion des clics sur les éléments du menu déroulant (pour toutes les cellules)
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.addEventListener('click', function (e) {
            const item = e.target.closest('.dropdown-item');
            if (item) {
                e.stopPropagation();
                const cell = this.closest('.cell');
                const contentSpan = cell?.querySelector('.cell-content');
                if (!contentSpan) return;

                // Gérer le bouton PAUSE/REPRENDRE
                if (item.id === 'dropdown-pause-btn-a1') {
                    togglePauseResume();
                    this.classList.remove('show');
                    activeMenu = null;
                    return;
                }

                let newText = item.querySelector('.dropdown-item-content')?.textContent.trim();
                if (newText?.toLowerCase() === 'vide') {
                    const initialText = cell.getAttribute('data-initial-text');
                    contentSpan.textContent = initialText;
                    contentSpan.classList.add('placeholder');
                } else {
                    contentSpan.textContent = newText;
                    contentSpan.classList.remove('placeholder');
                }

                if (cell.id === 'a1') {
                    const itemId = item.id;
                    if (itemId === 'dropdown-fin-btn-a1') {
                        handleFinTask();
                        this.classList.remove('show');
                        activeMenu = null;
                        return;
                    } else {
                        if (selectedLocale && selectedLocale !== newText) {
                            savePreviousTaskState(selectedLocale);
                        }
                        selectedLocale = newText;
                        cell.classList.remove('required-yellow');
                        cell.classList.add('user-locale-selected');
                        loadControlLocationsForLocale(selectedLocale, false);
                        const a2ContentSpan = document.getElementById('a2')?.querySelector('.cell-content');
                        if (a2ContentSpan) {
                            a2ContentSpan.textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                            a2ContentSpan.classList.remove('placeholder');
                        }
                        taskStartTime = new Date();
                        showA1Buttons();
                    }
                } else if (cell.id === 'd1') {
                    if (newText.includes('★')) {
                        newText = newText.substring(2, newText.indexOf(' ('));
                    }
                    setDefaultUser(newText);
                    cell.classList.remove('required-yellow');
                    cell.classList.add('user-locale-selected');
                }
                contentSpan.style.color = '';
            }
            this.classList.remove('show');
            activeMenu = null;
        });
    });

    // Gestion du clic sur C3 pour le cycle de couleurs
    document.getElementById('c3')?.addEventListener('click', function () {
        let state = parseInt(this.dataset.colorState || 0);
        state = (state + 1) % 3;
        this.classList.remove('required-yellow', 'text-green', 'text-red');
        this.querySelector('.cell-content').style.color = '';
        if (state === 1) {
            this.classList.add('text-green');
            this.querySelector('.cell-content').textContent = 'X';
        } else if (state === 2) {
            this.classList.add('text-red');
            this.querySelector('.cell-content').textContent = 'X';
        } else {
            this.classList.add('required-yellow');
            this.querySelector('.cell-content').textContent = 'Contrôle Xylophage';
        }
        this.dataset.colorState = state.toString();
        updateResults();
    });

    // Gestion du clic sur C2 (liste et condensation)
    document.getElementById('c2')?.addEventListener('click', function (e) {
        const item = e.target.closest('.location-item');
        if (item) {
            e.stopPropagation();
            const currentState = parseInt(item.dataset.colorState || 0);
            const newState = (currentState + 1) % 3;
            item.classList.remove('text-green-c2', 'text-red-c2');
            item.dataset.colorState = '0';
            if (newState === 1) {
                item.classList.add('text-green-c2');
                item.dataset.colorState = '1';
            } else if (newState === 2) {
                item.classList.add('text-red-c2');
                item.dataset.colorState = '2';
            }
            updateResults();
        } else {
            const c2Cell = document.getElementById('c2');
            if (c2Cell?.classList.contains('c2-condensed-green') || c2Cell?.classList.contains('c2-condensed-red')) {
                if (selectedLocale) {
                    loadControlLocationsForLocale(selectedLocale, true);
                } else {
                    showC2Buttons();
                }
            }
        }
    });

    // Fermeture des menus et condensation de C2 au clic ailleurs
    document.addEventListener('click', function (e) {
        if (activeMenu) {
            activeMenu.classList.remove('show');
            activeMenu = null;
        }
        const c2Cell = document.getElementById('c2');
        if (c2Cell?.querySelector('.location-list') && !c2Cell.contains(e.target)) {
            const redItems = c2Cell.querySelectorAll('.location-item.text-red-c2').length;
            const greenItems = c2Cell.querySelectorAll('.location-item.text-green-c2').length;
            if (redItems > 0) {
                condenseC2(`${redItems}R`);
            } else if (greenItems > 0) {
                condenseC2('xR');
            } else {
                condenseC2('xR');
            }
            updateResults();
        }
    });
});
