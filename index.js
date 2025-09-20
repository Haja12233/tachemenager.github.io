// index.js (mis à jour avec TOUTES les fonctionnalités et corrections discutées)
document.addEventListener('DOMContentLoaded', function () {
    // Configuration et variables globales
    const initialUsers = ['Anniva', 'Tina'];
    let initialLocales = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'];
    let defaultUser = null, defaultUserExpiry = null;
    const requiredCells = ['a1', 'a2', 'a3', 'c2', 'c3', 'd1'];
    let activeMenu = null;
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz7NrE1iwl4vthz2Sxx3DIOoRXrSkq8nolvjefXo-w-KdBaP948MGa19hRanVgR5EQK/exec';
    // Variables pour le suivi des tâches
    let taskHistory = []; // Pour Google Sheets
    let currentTaskIndex = 0;
    let selectedLocale = null;
    let startTime = null;
    // Nouvelles variables pour la gestion du temps
    let taskStartTime = null;
    let taskPauseTime = null;
    let taskEndTime = null;
    let isTaskPaused = false;
    let previousTaskEndTime = null; // Pour stocker l'heure de fin de la tâche précédente
    // --- NOUVEAU : Stockage pour les résultats à afficher dans le tableau ---
    let displayedTaskResults = [];
    // --- NOUVEAU : Fonction pour afficher la date courante ---
    function updateCurrentDate() {
        const dateElement = document.getElementById('current-date-display');
        if (dateElement) {
            const now = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            // Utiliser la locale française pour le formatage
            dateElement.textContent = now.toLocaleDateString('fr-FR', options);
        }
    }
    // Fonctions de gestion des données
    function saveResults() {
        const results = {};
        // Ajout de toutes les cellules nécessaires à la sauvegarde (seulement les utilisées)
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
                        // --- MODIFIE : Utilisation des classes spécifiques à C2 ---
                        if (item.classList.contains('text-green-c2')) c = 'green';
                        if (item.classList.contains('text-red-c2')) c = 'red';
                        return { text: item.textContent.trim(), color: c };
                    });
                    currentValue = JSON.stringify(locationsWithColor);
                } else if (contentSpanC2) {
                    // Si la case est condensée, on sauvegarde le texte
                    currentValue = contentSpanC2.textContent.trim();
                } else {
                    currentValue = '';
                }
            } else if (contentSpan) {
                currentValue = contentSpan.textContent.trim();
                // --- MODIFIE : Ne plus sauvegarder text-green pour A1/D1 ---
                // if (cell.classList.contains('text-green')) color = 'green'; // <-- Ligne supprimée
                if (cell.classList.contains('text-red')) color = 'red';
                // --- Ajout : Sauvegarder si la cellule A1/D1 a été sélectionnée ---
                // On peut utiliser un marqueur arbitraire, par exemple vérifier si le texte n'est plus le placeholder initial
                // Mais comme le texte est sauvegardé, on peut simplement ne pas restaurer de classe de couleur spécifique.
                // La classe required-yellow est retirée à la sélection, ce qui suffit.
                // --- MODIFIE : Logique de sauvegarde ---
                // Sauvegarder si :
                // 1. Une valeur existe
                // 2. ET la valeur est différente du texte initial *OU* c'est une des cellules optionnelles (car "Vide" est leur état)
                // OU si ce n'est pas une cellule optionnelle mais a une valeur différente du placeholder/initial.
            } else if (contentButton) {
                currentValue = contentButton.textContent.trim();
            }
            const initialText = cell.getAttribute('data-initial-text');
            if (currentValue && (currentValue !== initialText || ['a4', 'b4', 'c4', 'd4'].includes(id))) {
                results[id] = { value: currentValue, color: color };
            }
            // --- FIN MODIFICATION ---
        });
        localStorage.setItem('taskResults', JSON.stringify(results));
    }
    function loadResults() {
        const savedResults = localStorage.getItem('taskResults');
        // --- NOUVEAU : Initialiser les cellules A4,B4,C4,D4 avec "Vide" par défaut ---
        const optionalCells = ['a4', 'b4', 'c4', 'd4'];
        optionalCells.forEach(id => {
             const cell = document.getElementById(id);
             if (cell) {
                 const contentSpan = cell.querySelector('.cell-content');
                 if (contentSpan) {
                     // Si aucune valeur sauvegardée, mettre "Vide"
                     contentSpan.textContent = 'Vide';
                     contentSpan.classList.remove('placeholder');
                     // Ajouter une classe pour indiquer que c'est la valeur par défaut ?
                     // Pas nécessaire si on utilise simplement 'Vide' comme texte.
                 }
             }
        });
        // --- FIN NOUVEAU ---
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
                            // C'est une liste, on l'affiche en mode détaillé
                            showC2LocationList(locationsWithColor);
                            const container = cell.querySelector('.location-list');
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
                        } else {
                            // La case est condensée, on affiche le texte directement
                            condenseC2(value);
                        }
                    } catch (e) {
                        // Cas d'erreur, on affiche simplement le texte
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
                        // --- MODIFIE : Ne plus restaurer text-green pour A1/D1 ---
                        cell.classList.remove('required-yellow', 'text-green', 'text-red');
                        // --- MODIFIE : Ne pas ajouter text-green automatiquement ---
                        // if (results[id].color === 'green') cell.classList.add('text-green'); // <-- Ligne supprimée ou modifiée
                        if (results[id].color === 'red') cell.classList.add('text-red');
                        // --- Ajout : Si le texte n'est plus le placeholder initial, retirer required-yellow ---
                        // Cela est déjà géré par la logique de sélection dans le code principal.
                        // Lors du chargement, si une valeur a été sauvegardée, cela signifie qu'elle a été sélectionnée.
                        // On retire required-yellow. La couleur visuelle dépendra du CSS de la cellule sans classe de couleur.
                        const initialText = cell.getAttribute('data-initial-text');
                        if (results[id].value && results[id].value !== initialText) {
                             cell.classList.remove('required-yellow');
                             // Ne pas ajouter de classe de couleur spécifique ici.
                        }
                    } else if (contentButton) {
                        contentButton.textContent = results[id].value;
                    }
                }
            }
        }
    }
    // Fonctions utilitaires
    function createDropdownItem(text) {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        const span = document.createElement('span');
        span.className = 'dropdown-item-content';
        span.textContent = text;
        item.appendChild(span);
        return item;
    }
     // --- NOUVEAU : Fonction pour créer un élément de menu pour un bouton ---
     function createDropdownButtonItem(text, id) {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.id = id; // Ajouter un ID pour identification
        item.style.fontWeight = 'bold';
        item.style.cursor = 'pointer'; // S'assurer que le curseur indique que c'est cliquable
        const span = document.createElement('span');
        span.className = 'dropdown-item-content';
        span.textContent = text;
        item.appendChild(span);
        return item;
    }
    function showNotification(message, isCompletion = false) {
        const notification = document.getElementById('notification-banner');
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            if (isCompletion) resetAll(); // Cela va réinitialiser tout, y compris le tableau
        }, 2000);
    }
    function updateResults() {
        saveResults();
    }
    function saveTaskHistory() {
        // Sauvegarde dans localStorage si nécessaire pour persistance, mais pas d'affichage
        localStorage.setItem('taskHistory', JSON.stringify(taskHistory));
        localStorage.setItem('currentTaskIndex', currentTaskIndex.toString());
        // Sauvegarder aussi les résultats à afficher
        localStorage.setItem('displayedTaskResults', JSON.stringify(displayedTaskResults));
    }
    function loadTaskHistory() {
        // Charger depuis localStorage
        const savedHistory = localStorage.getItem('taskHistory');
        const savedIndex = localStorage.getItem('currentTaskIndex');
        const savedDisplayedResults = localStorage.getItem('displayedTaskResults');
        if (savedHistory) {
            taskHistory = JSON.parse(savedHistory);
        }
        if (savedIndex) {
            currentTaskIndex = parseInt(savedIndex);
        }
        if (savedDisplayedResults) {
            displayedTaskResults = JSON.parse(savedDisplayedResults);
            renderTaskResultsTable(); // Afficher le tableau au chargement
        }
    }
    // --- MODIFIE : addToDisplayedResults avec vérification améliorée ---
    function addToDisplayedResults(taskData) {
        // Récupérer les valeurs des cellules actuelles au moment de la finalisation
        const pavillon = taskData.locale || '';
        const debut = taskData.startTimeFormatted || ''; // Utiliser le format hh:mm:ss ou hh:mm
        const fin = taskData.endTimeFormatted || ''; // Utiliser le format hh:mm:ss ou hh:mm
        const utilisateur = taskData.user || '';
        // --- MODIFIE : Vérifier les doublons de pavillon parmi les pavillons de la liste ---
        // Vérifier que le pavillon est dans la liste initiale ET qu'il n'est pas déjà dans les résultats
        const isDuplicate = displayedTaskResults.some(result => result.pavillon === pavillon);
        const isInInitialList = initialLocales.includes(pavillon);
        if (isDuplicate || !isInInitialList) {
            if (isDuplicate) {
                 alert(`Le pavillon ${pavillon} a déjà été enregistré.`);
            } else {
                 alert(`Le pavillon ${pavillon} n'est pas dans la liste des pavillons valides.`);
            }
            return; // Ne pas ajouter si c'est un doublon ou non valide
        }
        // Récupérer les valeurs des cellules optionnelles AU MOMENT DE L'AJOUT
        const getCellValue = (id) => {
            const cell = document.getElementById(id);
            if (!cell) return '';
            const contentSpan = cell.querySelector('.cell-content');
            const contentButton = cell.querySelector('button');
            if (contentSpan) {
                return contentSpan.textContent.trim();
            } else if (contentButton) {
                return contentButton.textContent.trim();
            }
            return '';
        };
        // --- MODIFIE : Gestion spéciale pour les cellules A4,B4,C4,D4 ---
        // Si elles sont à leur état par défaut (placeholder), retourner "Vide"
        const getCellValueOrDefault = (id) => {
             const cell = document.getElementById(id);
             if (!cell) return '';
             const contentSpan = cell.querySelector('.cell-content');
             if (contentSpan && contentSpan.classList.contains('placeholder')) {
                 // Vérifier si c'est une des cellules concernées
                 if (['a4', 'b4', 'c4', 'd4'].includes(id)) {
                     return 'Vide'; // Valeur par défaut persistante
                 }
             }
             // Sinon, utiliser la logique normale
             return getCellValue(id);
        };
        // --- FIN MODIFICATION ---
        const a4 = getCellValueOrDefault('a4');
        const b4 = getCellValueOrDefault('b4');
        const c2Raw = getCellValue('c2');
        let c2 = '';
        // Déterminer la valeur de C2 en fonction de son état condensé ou détaillé
        const c2Cell = document.getElementById('c2');
        if (c2Cell.querySelector('.location-list')) {
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
        const c3ContentSpan = c3Cell.querySelector('.cell-content');
        let c3Value = '';
        let c3ColorClass = '';
        if (c3ContentSpan && c3ContentSpan.textContent.trim() === 'X') {
            c3Value = 'X';
            if (c3Cell.classList.contains('text-green')) {
                c3ColorClass = 'text-green';
            } else if (c3Cell.classList.contains('text-red')) {
                c3ColorClass = 'text-red';
            }
        } else {
            c3Value = c3ContentSpan ? c3ContentSpan.textContent.trim() : '';
        }
        const c4 = getCellValueOrDefault('c4');
        const d4 = getCellValueOrDefault('d4');
        // Créer un objet pour la ligne du tableau
        const tableRowData = {
            pavillon, debut, fin, utilisateur,
            a4,
            b4,
            c2,
            c3: { value: c3Value, colorClass: c3ColorClass }, // Stocker un objet avec valeur et couleur
            c4,
            d4
        };
        // Ajouter à la liste des résultats affichés
        displayedTaskResults.push(tableRowData);
        // Sauvegarder et afficher
        saveTaskHistory(); // Met à jour displayedTaskResults dans localStorage
        renderTaskResultsTable(); // --- CLÉ : Afficher/mettre à jour le tableau ---
    }
    // --- MODIFIE : renderTaskResultsTable pour afficher les heures ---
    function renderTaskResultsTable() {
        const container = document.getElementById('task-results-table-container');
        if (!container) return;
        if (displayedTaskResults.length === 0) {
            container.innerHTML = '<p style="margin-top: 15px; text-align: center;">Aucun résultat à afficher pour le moment.</p>';
            return;
        }
        let tableHTML = `
        <table id="task-results-table" style="width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 15px;">
            <thead>
                <tr style="background-color: #e9ecef;">
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
                </tr>
            </thead>
            <tbody>
        `;
        displayedTaskResults.forEach((row, index) => {
            // --- NOUVEAU : Extraire et formater l'heure de début ---
            let formattedDebut = '';
            if (row.debut) {
                // Supposons que row.debut est au format "HH:MM:SS" ou "HH:MM"
                const timeParts = row.debut.split(':');
                if (timeParts.length >= 2) {
                    // Prendre seulement HH:MM
                    formattedDebut = `${timeParts[0]}:${timeParts[1]}`;
                } else {
                    // Si le format est inattendu, afficher tel quel
                    formattedDebut = row.debut;
                }
            }
            // --- NOUVEAU : Extraire et formater l'heure de fin ---
            let formattedFin = '';
            if (row.fin) {
                // Supposons que row.fin est au format "HH:MM:SS" ou "HH:MM"
                const timeParts = row.fin.split(':');
                if (timeParts.length >= 2) {
                    // Prendre seulement HH:MM
                    formattedFin = `${timeParts[0]}:${timeParts[1]}`;
                } else {
                    // Si le format est inattendu, afficher tel quel
                    formattedFin = row.fin;
                }
            }
            tableHTML += `<tr style="border-bottom: 1px solid #ddd;">`;
            tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.pavillon || ''}</td>`;
            // --- MODIFIE : Utiliser l'heure formatée ---
            tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${formattedDebut}</td>`;
            tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${formattedFin}</td>`;
            // --- FIN MODIFICATION ---
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
        tableHTML += `
            </tbody>
        </table>
        `;
        container.innerHTML = tableHTML;
    }
    // --- FIN MODIFICATION ---
    // Fonctions de gestion des cellules
    function resetAllExceptA1D1A3() {
        const cellsToReset = ['a2', 'a4', 'b4', 'c2', 'c3', 'c4', 'd4'];
        cellsToReset.forEach(id => {
            const cell = document.getElementById(id);
            if (!cell) return;
            if (id === 'c2') {
                showC2Buttons(); // Remet en mode initial
            } else {
                const initialText = cell.getAttribute('data-initial-text');
                const contentSpan = cell.querySelector('.cell-content');
                if (contentSpan) {
                    contentSpan.textContent = initialText;
                    contentSpan.classList.add('placeholder');
                    contentSpan.classList.remove('default-user');
                }
            }
            // --- MODIFIE : Ne plus retirer/ajouter text-green pour A1/D1 ici ---
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
                     // --- MODIFIE : Pour A4/B4/C4/D4, remettre "Vide" ---
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
            // --- MODIFIE : Ne plus retirer/ajouter text-green pour A1/D1 ici ---
            cell.classList.remove('text-green', 'text-red', 'default-user-active', 'c2-condensed-green', 'c2-condensed-red');
            if (['a1', 'c2', 'c3', 'd1'].includes(id)) {
                cell.classList.add('required-yellow');
            }
            cell.dataset.colorState = '0';
        });
        localStorage.removeItem('taskResults');
        defaultUser = null;
        defaultUserExpiry = null;
        localStorage.removeItem('defaultUserD1');
        updateA1Menu(); // Met à jour le menu A1 (y compris les boutons)
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
    // Fonctions pour la cellule D1 (Utilisateur)
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
                cell.querySelector('.cell-content').textContent = defaultUser;
                cell.querySelector('.cell-content').classList.remove('placeholder');
                cell.querySelector('.cell-content').classList.add('default-user');
                cell.classList.remove('required-yellow');
                // --- MODIFIE : Ne plus ajouter text-green ici ---
                // cell.classList.add('text-green', 'default-user-active'); // <-- Ligne modifiée
                cell.classList.add('default-user-active');
                // --- NOUVEAU : Ajouter la classe pour le fond vert ---
                cell.classList.add('user-locale-selected');
                // --- FIN NOUVEAU ---
                updateD1MenuWithDefault();
            } else {
                localStorage.removeItem('defaultUserD1');
            }
        }
    }
    function setDefaultUser(name) {
        defaultUser = name;
        defaultUserExpiry = Date.now() + 28800000;
        const cell = document.getElementById('d1');
        cell.querySelector('.cell-content').textContent = defaultUser;
        cell.querySelector('.cell-content').classList.remove('placeholder');
        cell.querySelector('.cell-content').classList.add('default-user');
        cell.classList.remove('required-yellow');
        // --- MODIFIE : Ne plus ajouter text-green ici ---
        // cell.classList.add('text-green', 'default-user-active'); // <-- Ligne modifiée
        cell.classList.add('default-user-active');
        // --- NOUVEAU : Ajouter la classe pour le fond vert ---
        // La fonction setDefaultUser ajoute 'default-user-active'. On peut l'utiliser ou ajouter 'user-locale-selected' aussi.
        // Pour plus de cohérence visuelle, ajoutons 'user-locale-selected' ici aussi.
        cell.classList.add('user-locale-selected');
        // --- FIN NOUVEAU ---
        saveDefaultUser();
        updateD1MenuWithDefault();
        showNotification(`Utilisateur "${defaultUser}" défini par défaut pour 8h !`);
    }
    function updateD1MenuWithDefault() {
        const menu = document.querySelector('#d1 .dropdown-menu');
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
    // Fonctions pour la cellule A1 (Locale) - MODIFIEES
    function updateA1Menu() {
        const menu = document.querySelector('#a1 .dropdown-menu');
        menu.innerHTML = '';
        initialLocales.forEach(locale => {
            menu.appendChild(createDropdownItem(locale));
        });
        // --- MODIFIE : Supprimé le 'if (selectedLocale)' pour afficher toujours les boutons ---
        // Ajouter un séparateur visuel
        const separator = document.createElement('div');
        separator.className = 'dropdown-item-separator';
        separator.style.borderTop = '1px solid var(--border-color)';
        separator.style.margin = '4px 0';
        menu.appendChild(separator);
        // Créer et ajouter le bouton PAUSE
        const pauseItem = createDropdownButtonItem('⏸️ PAUSE', 'dropdown-pause-btn-a1');
        // Appliquer le style initial ou le style "en pause"
        if (isTaskPaused) {
            pauseItem.style.backgroundColor = 'var(--required-color)'; // Jaune
            pauseItem.querySelector('.dropdown-item-content').textContent = '⏯️ REPRENDRE'; // Texte dynamique
        }
        menu.appendChild(pauseItem);
        // Créer et ajouter le bouton FIN
        const finItem = createDropdownButtonItem('⏹️ FIN', 'dropdown-fin-btn-a1');
        finItem.style.color = 'var(--success-color)'; // Vert
        menu.appendChild(finItem);
        // --- FIN MODIFICATION ---
    }
    // --- MODIFIE : showA1Buttons ne crée plus les boutons dans la cellule ---
    function showA1Buttons() {
        // Les boutons sont maintenant dans le menu déroulant.
        // On met à jour le menu pour y inclure les boutons.
        updateA1Menu();
        // Optionnel : Masquer les anciens boutons si ils existent encore (par sécurité)
        const oldButtonContainer = document.getElementById('a1').querySelector('.action-buttons');
        if (oldButtonContainer) {
            oldButtonContainer.style.display = 'none'; // Ou oldButtonContainer.remove();
        }
    }
    // --- NOUVEAU : Fonction pour sauvegarder l'état de la tâche précédente ---
    function savePreviousTaskState(previousLocale) {
        // Cette fonction ressemble beaucoup à addToDisplayedResults, mais utilise les valeurs actuelles
        // Récupérer les valeurs des cellules actuelles au moment du changement de pavillon
        const pavillon = previousLocale || '';
        // Heure de début actuelle (de la tâche précédente)
        const debutElement = document.getElementById('a2').querySelector('.cell-content');
        const debut = debutElement && !debutElement.classList.contains('placeholder') ? debutElement.textContent : '';
        // Heure de fin : Si A3 a une valeur, on la prend. Sinon, on met l'heure actuelle ou une indication.
        const finElement = document.getElementById('a3').querySelector('.cell-content');
        let fin = '';
        if (finElement && !finElement.classList.contains('placeholder')) {
            fin = finElement.textContent;
        } else {
            // Si la tâche n'est pas explicitement "finie", on peut mettre "Interruption" ou l'heure actuelle.
            // Pour plus de clarté, mettons l'heure actuelle comme heure de fin de cette tâche partielle.
            fin = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        }
        // Utilisateur actuel
        const utilisateurElement = document.getElementById('d1').querySelector('.cell-content');
        const utilisateur = utilisateurElement && !utilisateurElement.classList.contains('placeholder') ? utilisateurElement.textContent : '';
        // Récupérer les valeurs des cellules optionnelles AU MOMENT DU CHANGEMENT
        const getCellValue = (id) => {
            const cell = document.getElementById(id);
            if (!cell) return '';
            const contentSpan = cell.querySelector('.cell-content');
            const contentButton = cell.querySelector('button');
            if (contentSpan) {
                // Si c'est le texte initial/placeholder, on considère comme "Vide"
                // Pour simplifier ici, on retourne le texte trimmé.
                return contentSpan.textContent.trim();
            } else if (contentButton) {
                return contentButton.textContent.trim();
            }
            return '';
        };
        // --- MODIFIE : Gestion spéciale pour les cellules A4,B4,C4,D4 ---
        // Si elles sont à leur état par défaut (placeholder), retourner "Vide"
        const getCellValueOrDefault = (id) => {
             const cell = document.getElementById(id);
             if (!cell) return '';
             const contentSpan = cell.querySelector('.cell-content');
             if (contentSpan && contentSpan.classList.contains('placeholder')) {
                 // Vérifier si c'est une des cellules concernées
                 if (['a4', 'b4', 'c4', 'd4'].includes(id)) {
                     return 'Vide'; // Valeur par défaut persistante
                 }
             }
             // Sinon, utiliser la logique normale
             return getCellValue(id);
        };
        // --- FIN MODIFICATION ---
        const a4 = getCellValueOrDefault('a4');
        const b4 = getCellValueOrDefault('b4');
        const c2Raw = getCellValue('c2');
        let c2 = '';
        // Déterminer la valeur de C2 en fonction de son état condensé ou détaillé
        const c2Cell = document.getElementById('c2');
        if (c2Cell.querySelector('.location-list')) {
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
        const c3ContentSpan = c3Cell.querySelector('.cell-content');
        let c3Value = '';
        let c3ColorClass = '';
        if (c3ContentSpan && c3ContentSpan.textContent.trim() === 'X') {
            c3Value = 'X';
            if (c3Cell.classList.contains('text-green')) {
                c3ColorClass = 'text-green';
            } else if (c3Cell.classList.contains('text-red')) {
                c3ColorClass = 'text-red';
            }
        } else {
            // Si C3 n'a pas de 'X', on met sa valeur textuelle ou 'Vide' si placeholder
            if (c3ContentSpan && !c3ContentSpan.classList.contains('placeholder')) {
                 c3Value = c3ContentSpan.textContent.trim();
                 // Si c'est le texte initial, peut-être ne pas le sauvegarder ?
                 // Mais pour l'historique, on veut tout. Donc on le garde.
            } else {
                c3Value = c3ContentSpan ? c3ContentSpan.textContent.trim() : 'Vide'; // Ou '' ?
                // Pour être cohérent avec A4/B4, mettons 'Vide' si placeholder.
                if (c3ContentSpan && c3ContentSpan.classList.contains('placeholder')) {
                    c3Value = 'Vide';
                }
            }
        }
        const c4 = getCellValueOrDefault('c4');
        const d4 = getCellValueOrDefault('d4');
        // --- NOUVEAU : Vérifier les doublons pour l'historique aussi ---
        const isDuplicate = displayedTaskResults.some(result => result.pavillon === pavillon);
        const isInInitialList = initialLocales.includes(pavillon);
        if (isDuplicate || !isInInitialList) {
            // Ne pas sauvegarder si c'est un doublon ou non valide.
            // On pourrait afficher une alerte, mais cela pourrait être intrusif.
            // Pour l'instant, on ne fait rien. Si vous voulez une alerte, décommentez la ligne ci-dessous :
            // if (isDuplicate) alert(`Historique : Le pavillon ${pavillon} a déjà été enregistré.`);
            return;
        }
        // --- FIN NOUVEAU ---
        // Créer un objet pour la ligne du tableau
        const tableRowData = {
            pavillon, debut, fin, utilisateur,
            a4,
            b4,
            c2,
            c3: { value: c3Value, colorClass: c3ColorClass }, // Stocker un objet avec valeur et couleur
            c4,
            d4
        };
        // Ajouter à la liste des résultats affichés
        displayedTaskResults.push(tableRowData);
        // Sauvegarder et afficher
        saveTaskHistory(); // Met à jour displayedTaskResults dans localStorage
        renderTaskResultsTable(); // --- CLÉ : Afficher/mettre à jour le tableau ---
    }
    // --- FIN NOUVEAU ---
    // Fonctions pour la cellule C2
    function showC2Buttons() {
        const cell = document.getElementById('c2');
        cell.innerHTML = `<span class="cell-content placeholder-text">Sélectionnez Locale</span>`;
        cell.classList.remove('c2-condensed-green', 'c2-condensed-red');
        cell.classList.add('required-yellow');
    }
    function showC2LocationList(locationsWithColor) {
        const c2Cell = document.getElementById('c2');
        c2Cell.innerHTML = `
            <div class="location-container">
                <div class="location-list"></div>
                <div class="list-add-button" id="add-locale-c2">+</div>
            </div>`;
        c2Cell.classList.remove('c2-condensed-green', 'c2-condensed-red');
        c2Cell.classList.add('required-yellow');
        const container = c2Cell.querySelector('.location-list');
        if (locationsWithColor) {
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
                // --- MODIFIE : Appeler la nouvelle fonction handleListAdd ---
                handleListAdd(c2Cell);
            });
        }
    }
    // --- NOUVEAU : Fonction pour charger les lieux de contrôle depuis Google Sheet OU les données sauvegardées ---
    function loadControlLocationsForLocale(locale, useSavedData = false) {
        const c2Cell = document.getElementById('c2');
        c2Cell.innerHTML = `<span class="cell-content">Chargement...</span>`;
        // Si on doit utiliser les données sauvegardées (lors d'un recliquage sur C2 condensé)
        if (useSavedData) {
            const savedResults = localStorage.getItem('taskResults');
            if (savedResults) {
                try {
                    const results = JSON.parse(savedResults);
                    if (results['c2'] && results['c2'].value) {
                        const locationsWithColor = JSON.parse(results['c2'].value);
                        if (Array.isArray(locationsWithColor)) {
                            showC2LocationList(locationsWithColor);
                            return; // Fin de la fonction, on a affiché les données
                        }
                    }
                } catch (e) {
                    console.error("Erreur lors du chargement des données sauvegardées:", e);
                }
            }
            // Si les données sauvegardées ne sont pas valides ou absentes,
            // on charge depuis Google Sheet comme d'habitude.
        }
        // Chargement depuis Google Sheet
        const url = `${SCRIPT_URL}?locale=${encodeURIComponent(locale)}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                const locations = (data.success && data.data) ? data.data : [];
                // Fusionner avec les valeurs par défaut si locale est P1
                if (locale === 'P1') {
                    const defaultLocations = ['Chambre', 'Terrasse'];
                    defaultLocations.forEach(loc => {
                        if (!locations.includes(loc)) {
                            locations.push(loc);
                        }
                    });
                }
                if (locations.length > 0) {
                    // Convertir en format objet pour la fonction showC2LocationList
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
    // --- NOUVEAU : Fonction pour condenser C2 ---
    function condenseC2(value) {
        const c2Cell = document.getElementById('c2');
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
            c2Cell.classList.add('c2-condensed-green'); // Pour le cas "xR" ou "R" simple
        }
    }
    // --- NOUVEAU : Fonctions pour B4 et C4 ---
    function updateB4Menu() {
        const menu = document.querySelector('#b4 .dropdown-menu');
        menu.innerHTML = '';
        const items = ["Vide", "1", "2", "3"]; // Liste demandée
        items.forEach(itemText => {
            menu.appendChild(createDropdownItem(itemText));
        });
    }
    function updateC4Menu() {
        const menu = document.querySelector('#c4 .dropdown-menu');
        menu.innerHTML = '';
        const items = ["Vide", "1", "2", "3"]; // Liste demandée
        items.forEach(itemText => {
            menu.appendChild(createDropdownItem(itemText));
        });
    }
    // --- FIN NOUVEAU : Fonctions pour B4 et C4 ---
    // Fonctions des nouvelles cases facultatives A4 et D4
    function updateA4Menu() {
        const menu = document.querySelector('#a4 .dropdown-menu');
        menu.innerHTML = '';
        const items = ["Vide", "01", "02", "10", "11", "12", "20", "21", "11"];
        items.forEach(itemText => {
            menu.appendChild(createDropdownItem(itemText));
        });
    }
    function updateD4Menu() {
        const menu = document.querySelector('#d4 .dropdown-menu');
        menu.innerHTML = '';
        const items = ["Vide", "1", "2", "3", "4", "5"];
        items.forEach(itemText => {
            menu.appendChild(createDropdownItem(itemText));
        });
    }
    // Listeners et initialisation
    document.querySelectorAll('.cell').forEach(cell => {
        // --- MODIFIE : Ajouter B4 et C4 aux listeners ---
        if (cell.id === 'b4' || cell.id === 'c4') {
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
        else if (cell.id === 'a4' || cell.id === 'd4') {
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
    // --- Fonction pour gérer les clics sur les items de dropdown ---
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.addEventListener('click', function (e) {
            const item = e.target.closest('.dropdown-item');
            if (item) {
                e.stopPropagation();
                const cell = this.closest('.cell');
                const contentSpan = cell.querySelector('.cell-content');
                let newText = item.querySelector('.dropdown-item-content').textContent.trim();
                if (newText.toLowerCase() === 'vide') {
                    const initialText = cell.getAttribute('data-initial-text');
                    contentSpan.textContent = initialText;
                    contentSpan.classList.add('placeholder');
                } else {
                    contentSpan.textContent = newText;
                    contentSpan.classList.remove('placeholder');
                }
                if (cell.id === 'a1') {
                    // --- NOUVEAU : Sauvegarder la tâche précédente si un pavillon était sélectionné ---
                    if (selectedLocale && selectedLocale !== newText) {
                        // Vérifier si les cases obligatoires pour la tâche précédente sont remplies
                        // On peut simplifier en vérifiant juste A1, A2, A3, C2, C3, D1
                        // Ou on peut vérifier si au moins une case autre qu'A1 a une valeur significative.
                        // Pour plus de simplicité, on sauvegarde toujours si un pavillon différent est choisi.
                        savePreviousTaskState(selectedLocale);
                    }
                    // --- FIN NOUVEAU ---
                    selectedLocale = newText;
                    cell.classList.remove('required-yellow');
                    // --- NOUVEAU : Ajouter la classe pour le fond vert ---
                    cell.classList.add('user-locale-selected');
                    // --- FIN NOUVEAU ---
                    loadControlLocationsForLocale(selectedLocale, false); // Charger depuis Google Sheet
                    document.getElementById('a2').querySelector('.cell-content').textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    document.getElementById('a2').classList.remove('placeholder');
                    taskStartTime = new Date();
                    showA1Buttons(); // Met à jour le menu pour inclure les boutons
                    // Ancien code pour les boutons dans la cellule (désormais masqué/inutile)
                    // document.getElementById('a1').querySelector('.pause-btn').style.display = 'block';
                    // document.getElementById('a1').querySelector('.fin-btn').style.display = 'block';
                } else if (cell.id === 'd1') {
                    if (newText.includes('★')) {
                        // Si on reclique sur l'utilisateur par défaut, ne rien faire
                        newText = newText.substring(2, newText.indexOf(' ('));
                    }
                    setDefaultUser(newText);
                    cell.classList.remove('required-yellow');
                    // --- NOUVEAU : Ajouter la classe pour le fond vert ---
                    cell.classList.add('user-locale-selected');
                    // --- FIN NOUVEAU ---
                }
                contentSpan.style.color = '';
            }
            // Fermer le menu si un item (locale ou bouton) a été sélectionné/cliqué
            this.classList.remove('show');
            activeMenu = null;
        });
    });
    // --- Fonction pour gérer le cycle de couleurs de C3 ---
    document.getElementById('c3').addEventListener('click', function () {
        let state = parseInt(this.dataset.colorState || 0);
        state = (state + 1) % 3; // Cycle 0 -> 1 -> 2 -> 0
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
    // --- MODIFIE : Fonction pour gérer les clics sur la cellule C2 ---
    document.getElementById('c2').addEventListener('click', function (e) {
        const item = e.target.closest('.location-item');
        if (item) {
            // Gestion du clic sur un item de la liste (changement de couleur)
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
            // Sauvegarder immédiatement l'état mis à jour de C2
            updateResults();
        } else {
            // Gestion du clic sur la cellule C2 elle-même
            const c2Cell = document.getElementById('c2');
            // Si la case est actuellement condensée (affiche un résumé comme "2R" ou "xR")
            if (c2Cell.classList.contains('c2-condensed-green') || c2Cell.classList.contains('c2-condensed-red')) {
                // Vérifier qu'un pavillon est sélectionné dans A1
                if (selectedLocale) {
                    // Réafficher la liste détaillée avec les données sauvegardées
                    loadControlLocationsForLocale(selectedLocale, true); // true = utiliser les données sauvegardées
                } else {
                    // Si aucun pavillon n'est sélectionné, afficher l'état par défaut
                    showC2Buttons();
                }
            }
            // Si la case est déjà en mode liste détaillée, ne rien faire de particulier ici.
            // Le clic sur la cellule lui-même ne la ferme pas automatiquement.
            // Elle se ferme et se condense uniquement lorsqu'on clique en dehors (géré par le listener document.addEventListener('click', ...) plus bas).
        }
    });
    // --- Écouteurs d'événements pour les boutons d'action ---
    document.getElementById('a1').addEventListener('click', handleA1Click);
    // --- NOUVEAU : Ajouter un écouteur de clic à la cellule D1 pour ouvrir/fermer son menu ---
    document.getElementById('d1').addEventListener('click', function(e) {
        // Empêcher la propagation pour éviter de déclencher le document click plus bas
        // qui fermerait immédiatement le menu
        e.stopPropagation();
        const menu = this.querySelector('.dropdown-menu');
        if (menu) {
            // Fermer tout autre menu actif
            if (activeMenu && activeMenu !== menu) {
                activeMenu.classList.remove('show');
            }
            // Basculer l'affichage du menu de D1
            menu.classList.toggle('show');
            // Mettre à jour la référence activeMenu
            activeMenu = menu.classList.contains('show') ? menu : null;
        }
    });
    // --- FIN NOUVEAU ---
    document.getElementById('refresh-button').addEventListener('click', manualRefresh);
    function handleA1Click(e) {
        // --- MODIFIE : Supprimer la condition qui empêchait le réouverture ---
        // if (selectedLocale) return; // <-- Ligne supprimée
        e.stopPropagation();
        const menu = this.querySelector('.dropdown-menu');
        if (activeMenu && activeMenu !== menu) {
            activeMenu.classList.remove('show');
        }
        // Mettre à jour le menu avant de l'afficher pour refléter l'état actuel (boutons)
        updateA1Menu();
        menu.classList.toggle('show');
        activeMenu = menu.classList.contains('show') ? menu : null;
    }
    function handleFinTask() {
        const c3Cell = document.getElementById('c3');
        const c3ColorState = parseInt(c3Cell.dataset.colorState || 0);
        if (c3ColorState === 0) {
            alert("Veuillez sélectionner une valeur pour la case 'Contrôle Xylophage' (C3) avant de terminer la tâche.");
            return;
        }
        if (checkCompletion()) {
            const finTime = new Date();
            const finTimeFormatted = finTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            document.getElementById('a3').querySelector('.cell-content').textContent = finTimeFormatted;
            document.getElementById('a3').classList.remove('placeholder');
            const taskData = {
                locale: selectedLocale,
                user: document.getElementById('d1').querySelector('.cell-content').textContent,
                startTimeFormatted: document.getElementById('a2').querySelector('.cell-content').textContent,
                endTimeFormatted: finTimeFormatted,
                a4: document.getElementById('a4').querySelector('.cell-content').textContent,
                b4: document.getElementById('b4').querySelector('.cell-content').textContent,
                c2: document.getElementById('c2').querySelector('.cell-content').textContent,
                c3: c3Cell.querySelector('.cell-content').textContent,
                c4: document.getElementById('c4').querySelector('.cell-content').textContent,
                d4: document.getElementById('d4').querySelector('.cell-content').textContent
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
    function handlePauseTask() {
        if (isTaskPaused) {
            isTaskPaused = false;
            // const pauseBtn = document.getElementById('a1').querySelector('.pause-btn'); // Ancien bouton
            // pauseBtn.textContent = 'PAUSE';
            // pauseBtn.style.backgroundColor = '';
            showNotification('Tâche reprise ! ▶️');
        } else {
            isTaskPaused = true;
            // const pauseBtn = document.getElementById('a1').querySelector('.pause-btn'); // Ancien bouton
            // pauseBtn.textContent = 'REPRISE';
            // pauseBtn.style.backgroundColor = 'var(--required-color)';
            showNotification('Tâche mise en pause ⏸️');
        }
         // Mettre à jour le menu A1 pour refléter l'état du bouton pause
         updateA1Menu();
    }
    // --- MODIFIE : Fonction handleListAdd mise à jour ---
    function handleListAdd(cell) {
        // --- MODIFIE : Utiliser prompt au lieu d'un champ de texte dans la liste ---
        const newLocation = prompt("Veuillez entrer le nom du nouveau lieu :");
        // Vérifier si l'utilisateur a annulé (null) ou entré une chaîne vide
        if (newLocation === null) {
            // L'utilisateur a cliqué sur "Annuler" ou a fermé la boîte de dialogue
            // On ne fait rien.
            return;
        }
        const trimmedLocation = newLocation.trim();
        if (trimmedLocation === '') {
            // --- MODIFIE : Utiliser alert pour les messages d'erreur ---
            alert("Le nom du lieu ne peut pas être vide.");
            return;
        }
        // Vérifier si le lieu existe déjà dans la liste
        const existingItems = cell.querySelectorAll('.location-item');
        for (let item of existingItems) {
            if (item.textContent.trim().toLowerCase() === trimmedLocation.toLowerCase()) {
                 alert(`Le lieu "${trimmedLocation}" existe déjà dans la liste.`);
                 return; // Arrêter l'ajout
            }
        }
        // Si tout est OK, créer et ajouter le nouvel élément
        const locationItem = document.createElement('div');
        locationItem.className = 'location-item';
        locationItem.textContent = trimmedLocation;
        locationItem.dataset.colorState = '0'; // État par défaut (aucune couleur)
        const list = cell.querySelector('.location-list');
        if (list) {
            list.appendChild(locationItem);
            // Sauvegarder immédiatement l'état mis à jour de C2
            updateResults();
        } else {
             // Cas improbable, mais au cas où .location-list n'existe pas
             alert("Erreur : Impossible de trouver la liste pour ajouter le lieu.");
        }
    }
    // --- FIN MODIFICATION ---
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
    // --- MODIFIE : Fonction pour valider la case C2 au clic en dehors ---
    document.addEventListener('click', function (e) {
        const c2Cell = document.getElementById('c2');
        const isC2Click = c2Cell.contains(e.target); // Vérifie si le clic est à l'intérieur de C2
        // Fermer les menus déroulants actifs
        if (activeMenu) {
            activeMenu.classList.remove('show');
            activeMenu = null;
        }
        // Si la liste détaillée de C2 est actuellement affichée ET que le clic est en dehors de C2
        if (c2Cell.querySelector('.location-list') && !isC2Click) {
            // Compter les éléments colorés
            const redItems = c2Cell.querySelectorAll('.location-item.text-red-c2').length;
            const greenItems = c2Cell.querySelectorAll('.location-item.text-green-c2').length;
            // Condenser la case C2 en fonction du contenu
            if (redItems > 0) {
                condenseC2(`${redItems}R`); // Par exemple, "2R"
            } else if (greenItems > 0) {
                condenseC2('xR'); // Par exemple, "xR" si seulement verts
            } else {
                // Si aucun item n'a été coloré, on pourrait soit rester en liste,
                // soit condenser différemment. Ici, on choisit de condenser comme "xR".
                condenseC2('xR');
                // Alternative: Ne pas condenser si rien n'a changé:
                // return;
            }
            // Sauvegarder l'état condensé
            updateResults();
        }
        // Si le clic est en dehors de C2 et que C2 affiche autre chose (historique, état par défaut, etc.),
        // on ne fait rien de particulier ici. La logique reste la même.
    });
    // Initialisation
    loadDefaultUser();
    updateA1Menu(); // Initialise le menu A1 (avec les boutons)
    updateA4Menu();
    // --- MODIFIE : Appeler les nouvelles fonctions pour B4 et C4 ---
    updateB4Menu(); // <-- Ajout
    updateC4Menu(); // <-- Ajout
    updateD4Menu();
    loadResults();
    loadTaskHistory();
});
