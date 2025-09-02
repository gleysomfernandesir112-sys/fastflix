document.addEventListener('DOMContentLoaded', () => {
    let allChannels = { filmes: [], series: {}, tv: [] };
    const ITEMS_PER_PAGE = 20;
    let currentTab = 'filmes';
    const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5 MB

    function normalizeTitle(title) {
        return title.trim().replace(/\b\w/g, c => c.toUpperCase());
    }

    async function loadM3U() {
        const url = 'linkM3U.txt'; // Directly use the local file
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const fileContent = await response.text();
            const m3uUrl = fileContent.trim();

            if (!m3uUrl) {
                alert('O arquivo linkM3U.txt está vazio ou não foi encontrado.');
                return;
            }
            
            fetchAndParseM3U(m3uUrl);

        } catch (error) {
            console.error("Falha ao ler o linkM3U.txt:", error);
            alert("Não foi possível carregar o link da lista M3U. Verifique o arquivo 'linkM3U.txt'.");
        }
    }

    function fetchAndParseM3U(url) {
        const cacheKey = `m3u_data`; // Simplified cache key
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            try {
                const { timestamp, data } = JSON.parse(cached);
                // Cache valid for 1 hour
                if (Date.now() - timestamp < 3600000) { 
                    allChannels = data;
                    console.log('Carregado do cache.');
                    displayChannels();
                    return;
                }
            } catch (e) {
                console.error("Erro ao ler cache:", e);
                localStorage.removeItem(cacheKey); // Clear corrupted cache
            }
        }

        const progressContainer = document.getElementById('progress-container');
        const progress = document.getElementById('progress');
        ['filmes', 'series', 'tv'].forEach(id => document.getElementById(id).innerHTML = '');
        progressContainer.style.display = 'block';
        progress.style.width = '0%';

        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true); // Direct request
        xhr.responseType = 'text';

        xhr.onprogress = function(event) {
            if (event.lengthComputable) {
                const percent = (event.loaded / event.total) * 100;
                progress.style.width = percent + '%';
            }
        };

        xhr.onload = function() {
            progressContainer.style.display = 'none';
            if (xhr.status === 200) {
                parseM3U(xhr.response);
                try {
                    const cacheData = JSON.stringify({ timestamp: Date.now(), data: allChannels });
                    if (cacheData.length < MAX_CACHE_SIZE) {
                        localStorage.setItem(cacheKey, cacheData);
                    } else {
                        console.warn('Cache não salvo: lista muito grande.');
                    }
                } catch (e) {
                    console.error('Falha ao salvar cache:', e);
                }
            } else {
                alert('Erro ao carregar a lista M3U: ' + xhr.status);
            }
        };

        xhr.onerror = function() {
            progressContainer.style.display = 'none';
            alert('Erro de rede ao carregar a lista. Pode ser um problema de CORS. Tente usar um proxy CORS se o problema persistir.');
        };

        xhr.send();
    }

    function parseM3U(content) {
        const lines = content.split('\n');
        allChannels = { filmes: [], series: {}, tv: [] };
        let currentChannel = null;

        for (let line of lines) {
            line = line.trim();
            if (line.startsWith('#EXTINF:')) {
                const titleMatch = line.match(/,(.+)/);
                const groupMatch = line.match(/group-title="([^"]+)"/i);
                const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
                const title = titleMatch ? titleMatch[1] : 'Canal Desconhecido';
                currentChannel = {
                    title,
                    url: '',
                    group: groupMatch ? groupMatch[1].toLowerCase() : '',
                    logo: logoMatch ? logoMatch[1] : ''
                };
            } else if (line && !line.startsWith('#') && currentChannel) {
                currentChannel.url = line;
                categorizeChannel(currentChannel);
                currentChannel = null;
            }
        }
        displayChannels();
    }

    function categorizeChannel(channel) {
        const title = channel.title;
        const category = channel.group || '';

        if (category.includes('serie') || category.includes('série') || /s\d+\s*e\d+/i.test(title)) {
            const match = title.match(/^(.*?)\s*S(\d+) E(\d+)/i);
            let seriesName, season, episodeTitle;

            if (match) {
                seriesName = normalizeTitle(match[1]);
                season = match[2];
                episodeTitle = `Episódio ${match[3]}`;
            } else {
                seriesName = normalizeTitle(title.split(/ s\d+/i)[0]);
                season = "1";
                episodeTitle = title;
            }
            
            const seriesKey = seriesName.toLowerCase();
            if (!allChannels.series[seriesKey]) {
                allChannels.series[seriesKey] = { displayName: seriesName, seasons: {}, logo: channel.logo };
            }
            if (!allChannels.series[seriesKey].seasons[season]) {
                allChannels.series[seriesKey].seasons[season] = [];
            }
            allChannels.series[seriesKey].seasons[season].push({ title: episodeTitle, url: channel.url, logo: channel.logo });

        } else if (category.includes('filme') || category.includes('movie')) {
            allChannels.filmes.push({ title: normalizeTitle(title), url: channel.url, logo: channel.logo });
        } else {
            allChannels.tv.push({ title: normalizeTitle(title), url: channel.url, logo: channel.logo });
        }
    }

    window.switchTab = function(tab) {
        currentTab = tab;
        document.querySelectorAll('.navbar a, .navbar div').forEach(a => a.classList.remove('active'));
        document.getElementById(`${tab}-tab`).classList.add('active');
        document.querySelectorAll('.category').forEach(c => c.classList.remove('active'));
        document.getElementById(`${tab}-category`).classList.add('active');
        displayChannels(document.getElementById('search').value);
    }

    function displayChannels(filter = '') {
        const lowerFilter = filter.toLowerCase();
        ['filmes', 'series', 'tv'].forEach(id => {
            document.getElementById(id).innerHTML = '';
            document.getElementById(`${id}-pagination`).innerHTML = '';
        });

        if (currentTab === 'filmes') {
            const filtered = allChannels.filmes.filter(item => item.title.toLowerCase().includes(lowerFilter));
            displayPaginatedList('filmes', filtered, createMovieCard);
        } else if (currentTab === 'series') {
            const filtered = Object.values(allChannels.series).filter(item => item.displayName.toLowerCase().includes(lowerFilter));
            displayPaginatedList('series', filtered, createSeriesCard);
        } else if (currentTab === 'tv') {
            if (isLoggedIn()) {
                const filtered = allChannels.tv.filter(item => item.title.toLowerCase().includes(lowerFilter));
                displayPaginatedList('tv', filtered, createTVCard);
            } else {
                const tvContainer = document.getElementById('tv');
                tvContainer.innerHTML = `
                    <div class="text-center col-span-full mt-10">
                        <h3 class="text-2xl font-bold text-red-500 mb-4">Conteúdo Premium</h3>
                        <p class="text-gray-300 mb-6">Faça login para ter acesso aos canais de TV ao Vivo.</p>
                        <a href="index.html" class="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition">Fazer Login</a>
                    </div>
                `;
            }
        }
    }
    
    function createMovieCard(item) {
        const div = document.createElement('div');
        div.className = 'card bg-gray-800 rounded-md overflow-hidden';
        div.innerHTML = `
            <img src="${item.logo || 'https://via.placeholder.com/200x300?text=Filme'}" alt="${item.title}" class="w-full h-auto object-cover">
            <p class="p-2 text-center text-sm">${item.title}</p>
        `;
                div.onclick = () => window.location.href = 'player-page.html?videoUrl=' + encodeURIComponent(item.url);
        return div;
    }

    function createSeriesCard(item) {
        const div = document.createElement('div');
        div.className = 'card bg-gray-800 rounded-md overflow-hidden';
        div.innerHTML = `
            <img src="${item.logo || 'https://via.placeholder.com/200x300?text=Série'}" alt="${item.displayName}" class="w-full h-auto object-cover">
            <p class="p-2 text-center text-sm">${item.displayName}</p>
        `;
        div.onclick = () => openSeriesModal(item);
        return div;
    }

    function createTVCard(item) {
        const div = document.createElement('div');
        div.className = 'card bg-gray-800 rounded-md overflow-hidden';
        div.innerHTML = `
            <img src="${item.logo || 'https://via.placeholder.com/200x300?text=TV'}" alt="${item.title}" class="w-full h-auto object-cover">
            <p class="p-2 text-center text-sm">${item.title}</p>
        `;
                div.onclick = () => window.location.href = 'player-page.html?videoUrl=' + encodeURIComponent(item.url);
        return div;
    }


    function displayPaginatedList(categoryId, items, createItemElement) {
        const listContainer = document.getElementById(categoryId);
        const paginationContainer = document.getElementById(`${categoryId}-pagination`);
        let currentPage = 1;
        const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

        function renderPage(page) {
            currentPage = page;
            listContainer.innerHTML = '';
            const start = (page - 1) * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            items.slice(start, end).forEach(item => listContainer.appendChild(createItemElement(item)));
            renderPagination();
        }

        function renderPagination() {
            paginationContainer.innerHTML = '';
            if (totalPages <= 1) return;

            const prevButton = document.createElement('button');
            prevButton.textContent = 'Anterior';
            prevButton.disabled = currentPage === 1;
            prevButton.onclick = () => renderPage(currentPage - 1);
            paginationContainer.appendChild(prevButton);

            const nextButton = document.createElement('button');
            nextButton.textContent = 'Próxima';
            nextButton.disabled = currentPage === totalPages;
            nextButton.onclick = () => renderPage(currentPage + 1);
            paginationContainer.appendChild(nextButton);
        }

        renderPage(1);
    }

    window.openSeriesModal = function(series) {
        const modal = document.getElementById('series-modal');
        document.getElementById('modal-title').textContent = series.displayName;
        const seasonsContainer = document.getElementById('modal-seasons');
        seasonsContainer.innerHTML = '';

        Object.keys(series.seasons).sort().forEach(seasonNumber => {
            const seasonDiv = document.createElement('div');
            seasonDiv.className = 'mb-4';
            seasonDiv.innerHTML = `<h3 class="text-lg font-bold">Temporada ${seasonNumber}</h3>`;
            
            const episodesList = document.createElement('ul');
            episodesList.className = 'mt-2 space-y-2';
            series.seasons[seasonNumber].forEach(episode => {
                const li = document.createElement('li');
                li.className = 'p-2 hover:bg-gray-700 rounded cursor-pointer';
                li.textContent = episode.title;
                li.onclick = () => window.location.href = 'player-page.html?videoUrl=' + encodeURIComponent(episode.url);
                episodesList.appendChild(li);
            });
            seasonDiv.appendChild(episodesList);
            seasonsContainer.appendChild(seasonDiv);
        });

        modal.style.display = 'flex';
    }

    window.closeModal = function() {
        document.getElementById('series-modal').style.display = 'none';
    }

    

    window.filterItems = function() {
        const filter = document.getElementById('search').value;
        displayChannels(filter);
    }

    // Initial load
    loadM3U();
});