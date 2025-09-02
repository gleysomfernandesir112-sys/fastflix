document.addEventListener('DOMContentLoaded', () => {
    let allChannels = { filmes: [], series: {}, tv: [] };
    const ITEMS_PER_PAGE = 20;
    let currentTab = 'filmes';
    const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5 MB
    let lastNavigationTime = 0;
    const NAVIGATION_DEBOUNCE_MS = 1000; // 1 second debounce
    const CACHE_VALIDITY_MS = 24 * 3600000; // 24 hours

    function normalizeTitle(title) {
        return title.trim().replace(/\b\w/g, c => c.toUpperCase());
    }

    function debounceNavigation(url) {
        const now = Date.now();
        if (now - lastNavigationTime < NAVIGATION_DEBOUNCE_MS) {
            console.warn('Navegação bloqueada por debounce:', url);
            return false;
        }
        lastNavigationTime = now;
        console.log('Navegando para:', url);
        return true;
    }

    async function loadM3U() {
        const cacheKey = `m3u_data`;
        const startTime = performance.now();
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            try {
                const { timestamp, data } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_VALIDITY_MS && data && (
                    (data.filmes && data.filmes.length > 0) ||
                    (data.series && Object.keys(data.series).length > 0) ||
                    (data.tv && data.tv.length > 0)
                )) {
                    allChannels = data;
                    console.log('Carregado do cache:', allChannels);
                    console.log(`Cache carregado em ${performance.now() - startTime} ms`);
                    displayChannels();
                    return;
                } else {
                    console.log('Cache expirado ou inválido, recarregando...');
                }
            } catch (e) {
                console.error('Erro ao ler cache:', e);
                // Do not clear cache on parse error to preserve it
            }
        } else {
            console.log('Nenhum cache encontrado, carregando M3U...');
        }

        const filePaths = [
            './206609967_playlist.m3u',
            '/206609967_playlist.m3u',
            './206609967_playlist.M3U'
        ];
        const fallbackUrl = 'http://cdnnekotv.sbs/get.php?username=206609967&password=860883584&type=m3u_plus&output=m3u8';

        // Try local file paths
        for (const filePath of filePaths) {
            console.log(`Tentando carregar o arquivo M3U: ${filePath}`);
            try {
                const fetchStart = performance.now();
                const response = await fetch(filePath, {
                    headers: {
                        'Accept': 'text/plain,*/*'
                    }
                });
                console.log(`Status da resposta para ${filePath}: ${response.status}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
                }
                const content = await response.text();
                console.log(`Fetch levou ${performance.now() - fetchStart} ms`);
                console.log('Conteúdo do arquivo M3U:', content.substring(0, 500));
                const parseStart = performance.now();
                parseM3U(content);
                console.log(`ParseM3U levou ${performance.now() - parseStart} ms`);
                try {
                    if (allChannels.filmes.length > 0 || Object.keys(allChannels.series).length > 0 || allChannels.tv.length > 0) {
                        const cacheData = JSON.stringify({ timestamp: Date.now(), data: allChannels });
                        if (cacheData.length < MAX_CACHE_SIZE) {
                            localStorage.setItem(cacheKey, cacheData);
                            console.log('Cache salvo:', allChannels);
                        } else {
                            console.warn('Cache não salvo: lista muito grande.');
                            alert('A lista M3U é muito grande para o cache. Considere reduzir o número de canais.');
                        }
                    } else {
                        console.warn('Não salvando cache: nenhum canal válido encontrado.');
                    }
                } catch (e) {
                    console.error('Falha ao salvar cache:', e);
                }
                console.log(`Carregamento total levou ${performance.now() - startTime} ms`);
                return; // Success, exit loop
            } catch (error) {
                console.error(`Falha ao carregar o arquivo M3U (${filePath}):`, error.message);
            }
        }

        // Fallback to original URL
        console.log(`Tentando carregar o M3U do URL fallback: ${fallbackUrl}`);
        try {
            const fetchStart = performance.now();
            const response = await fetch(fallbackUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
                    'Accept': 'text/plain,*/*',
                    'Referer': 'http://localhost'
                }
            });
            console.log(`Status da resposta para ${fallbackUrl}: ${response.status}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }
            const content = await response.text();
            console.log(`Fetch do URL levou ${performance.now() - fetchStart} ms`);
            console.log('Conteúdo do M3U do URL:', content.substring(0, 500));
            const parseStart = performance.now();
            parseM3U(content);
            console.log(`ParseM3U levou ${performance.now() - parseStart} ms`);
            try {
                if (allChannels.filmes.length > 0 || Object.keys(allChannels.series).length > 0 || allChannels.tv.length > 0) {
                    const cacheData = JSON.stringify({ timestamp: Date.now(), data: allChannels });
                    if (cacheData.length < MAX_CACHE_SIZE) {
                        localStorage.setItem(cacheKey, cacheData);
                        console.log('Cache salvo:', allChannels);
                    } else {
                        console.warn('Cache não salvo: lista muito grande.');
                        alert('A lista M3U é muito grande para o cache. Considere reduzir o número de canais.');
                    }
                } else {
                    console.warn('Não salvando cache: nenhum canal válido encontrado.');
                }
            } catch (e) {
                console.error('Falha ao salvar cache:', e);
            }
            console.log(`Carregamento total levou ${performance.now() - startTime} ms`);
        } catch (error) {
            console.error(`Falha ao carregar o M3U do URL (${fallbackUrl}):`, error.message);
            alert(`Erro ao carregar a lista M3U: Não foi possível carregar "206609967_playlist.m3u" ou o URL fallback. Verifique o arquivo na pasta raiz e o servidor local (ex.: python -m http.server).`);
        }
    }

    function parseM3U(content) {
        if (!content || content.trim() === '') {
            console.error('M3U vazio ou inválido:', content);
            alert('O arquivo "206609967_playlist.m3u" ou URL está vazio ou inválido. Verifique o conteúdo em um player como VLC.');
            return;
        }

        console.log('Iniciando parse do M3U, linhas:', content.split('\n').length);
        const lines = content.split('\n');
        allChannels = { filmes: [], series: {}, tv: [] };
        let currentChannel = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#EXTINF:')) {
                const titleMatch = line.match(/,(.+)/) || line.match(/tvg-name="([^"]+)"/i);
                const groupMatch = line.match(/group-title="([^"]+)"/i);
                const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
                const title = titleMatch ? titleMatch[1].trim() : 'Canal Desconhecido';
                currentChannel = {
                    title,
                    url: '',
                    group: groupMatch ? groupMatch[1].toLowerCase() : '',
                    logo: logoMatch ? logoMatch[1] : ''
                };
                console.log('Encontrado #EXTINF:', currentChannel);
            } else if (line && !line.startsWith('#') && currentChannel) {
                currentChannel.url = line;
                console.log('URL associada:', currentChannel.url);
                categorizeChannel(currentChannel);
                currentChannel = null;
            }
        }

        console.log('Canais após parse:', JSON.stringify(allChannels, null, 2));
        if (allChannels.filmes.length === 0 && Object.keys(allChannels.series).length === 0 && allChannels.tv.length === 0) {
            console.warn('Nenhum canal válido encontrado no M3U');
            alert('Nenhum canal válido encontrado na lista M3U. Verifique o formato de "206609967_playlist.m3u" ou o URL em um player como VLC.');
        }
        displayChannels();
    }

    function categorizeChannel(channel) {
        const title = channel.title.toLowerCase();
        const category = channel.group.toLowerCase();
        console.log(`Categorizando: ${channel.title}, grupo: ${category}`);

        if (category.includes('serie') || category.includes('série') || /s\d+\s*e\d+/i.test(title) || /season|episode|episódio|temporada/i.test(title)) {
            let seriesName, season, episodeTitle;
            const match = title.match(/^(.*?)\s*s(\d+)\s*e(\d+)/i);

            if (match) {
                seriesName = normalizeTitle(match[1]);
                season = match[2];
                episodeTitle = `Episódio ${match[3]}`;
            } else {
                seriesName = normalizeTitle(title.split(/ s\d+| season| episódio/i)[0]);
                season = "1";
                episodeTitle = normalizeTitle(title);
            }

            const seriesKey = seriesName.toLowerCase();
            if (!allChannels.series[seriesKey]) {
                allChannels.series[seriesKey] = { displayName: seriesName, seasons: {}, logo: channel.logo };
            }
            if (!allChannels.series[seriesKey].seasons[season]) {
                allChannels.series[seriesKey].seasons[season] = [];
            }
            allChannels.series[seriesKey].seasons[season].push({ title: episodeTitle, url: channel.url, logo: channel.logo });
            console.log(`Adicionado à série: ${seriesName}, temporada ${season}, ${episodeTitle}`);
        } else if (category.includes('filme') || category.includes('movie') || /movie|filme/i.test(title)) {
            allChannels.filmes.push({ title: normalizeTitle(channel.title), url: channel.url, logo: channel.logo });
            console.log(`Adicionado a filmes: ${channel.title}`);
        } else {
            allChannels.tv.push({ title: normalizeTitle(channel.title), url: channel.url, logo: channel.logo });
            console.log(`Adicionado a TV: ${channel.title}`);
        }
    }

    window.switchTab = function(tab) {
        currentTab = tab;
        document.querySelectorAll('.navbar a, .navbar div').forEach(a => a.classList.remove('active'));
        document.getElementById(`${tab}-tab`).classList.add('active');
        document.querySelectorAll('.category').forEach(c => c.classList.remove('active'));
        document.getElementById(`${tab}-category`).classList.add('active');
        console.log(`Mudando para aba: ${tab}`);
        displayChannels(document.getElementById('search').value);
    }

    function displayChannels(filter = '') {
        console.log('Exibindo canais, filtro:', filter);
        const lowerFilter = filter.toLowerCase();
        // Only clear and render the active tab
        const activeId = currentTab;
        document.getElementById(activeId).innerHTML = '';
        document.getElementById(`${activeId}-pagination`).innerHTML = '';

        if (currentTab === 'filmes') {
            const filtered = allChannels.filmes.filter(item => item.title.toLowerCase().includes(lowerFilter));
            console.log('Filmes filtrados:', filtered);
            displayPaginatedList('filmes', filtered, createMovieCard);
        } else if (currentTab === 'series') {
            const filtered = Object.values(allChannels.series).filter(item => item.displayName.toLowerCase().includes(lowerFilter));
            console.log('Séries filtradas:', filtered);
            displayPaginatedList('series', filtered, createSeriesCard);
        } else if (currentTab === 'tv') {
            if (isLoggedIn()) {
                const filtered = allChannels.tv.filter(item => item.title.toLowerCase().includes(lowerFilter));
                console.log('Canais de TV filtrados:', filtered);
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
                console.log('Usuário não logado, exibindo mensagem de login para TV');
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
        div.addEventListener('click', (e) => {
            e.preventDefault();
            const url = 'player-page.html?videoUrl=' + encodeURIComponent(item.url);
            if (debounceNavigation(url)) {
                window.location.href = url;
            }
        });
        return div;
    }

    function createSeriesCard(item) {
        const div = document.createElement('div');
        div.className = 'card bg-gray-800 rounded-md overflow-hidden';
        div.innerHTML = `
            <img src="${item.logo || 'https://via.placeholder.com/200x300?text=Série'}" alt="${item.displayName}" class="w-full h-auto object-cover">
            <p class="p-2 text-center text-sm">${item.displayName}</p>
        `;
        div.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clicado em série:', item.displayName);
            openSeriesModal(item);
        });
        return div;
    }

    function createTVCard(item) {
        const div = document.createElement('div');
        div.className = 'card bg-gray-800 rounded-md overflow-hidden';
        div.innerHTML = `
            <img src="${item.logo || 'https://via.placeholder.com/200x300?text=TV'}" alt="${item.title}" class="w-full h-auto object-cover">
            <p class="p-2 text-center text-sm">${item.title}</p>
        `;
        div.addEventListener('click', (e) => {
            e.preventDefault();
            const url = 'player-page.html?videoUrl=' + encodeURIComponent(item.url);
            if (debounceNavigation(url)) {
                window.location.href = url;
            }
        });
        return div;
    }

    function displayPaginatedList(categoryId, items, createItemElement) {
        const listContainer = document.getElementById(categoryId);
        const paginationContainer = document.getElementById(`${categoryId}-pagination`);
        let currentPage = 1;
        const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

        console.log(`Exibindo ${categoryId}, total de itens: ${items.length}, páginas: ${totalPages}`);

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
            prevButton.addEventListener('click', () => renderPage(currentPage - 1));
            paginationContainer.appendChild(prevButton);

            const nextButton = document.createElement('button');
            nextButton.textContent = 'Próxima';
            nextButton.disabled = currentPage === totalPages;
            nextButton.addEventListener('click', () => renderPage(currentPage + 1));
            paginationContainer.appendChild(nextButton);
        }

        renderPage(1);
    }

    window.openSeriesModal = function(series) {
        const modal = document.getElementById('series-modal');
        document.getElementById('modal-title').textContent = series.displayName;
        const seasonsContainer = document.getElementById('modal-seasons');
        seasonsContainer.innerHTML = '';

        console.log('Abrindo modal para série:', series.displayName, JSON.stringify(series.seasons, null, 2));

        if (Object.keys(series.seasons).length === 0) {
            seasonsContainer.innerHTML = '<p class="text-red-500">Nenhum episódio encontrado para esta série.</p>';
        } else {
            Object.keys(series.seasons).sort().forEach(seasonNumber => {
                const seasonDiv = document.createElement('div');
                seasonDiv.className = 'mb-4';
                seasonDiv.innerHTML = `<h3 class="text-lg font-bold">Temporada ${seasonNumber}</h3>`;
                
                const episodesList = document.createElement('li');
                episodesList.className = 'mt-2 space-y-2';
                series.seasons[seasonNumber].forEach(episode => {
                    const li = document.createElement('li');
                    li.className = 'p-2 hover:bg-gray-700 rounded cursor-pointer';
                    li.textContent = episode.title;
                    li.addEventListener('click', () => {
                        const url = 'player-page.html?videoUrl=' + encodeURIComponent(episode.url);
                        if (debounceNavigation(url)) {
                            window.location.href = url;
                        }
                    });
                    episodesList.appendChild(li);
                });
                seasonDiv.appendChild(episodesList);
                seasonsContainer.appendChild(seasonDiv);
            });
        }

        modal.style.display = 'flex';
    }

    window.closeModal = function() {
        document.getElementById('series-modal').style.display = 'none';
    }

    window.filterItems = function() {
        const filter = document.getElementById('search').value;
        console.log('Aplicando filtro:', filter);
        displayChannels(filter);
    }

    // Initial load
    console.log('Iniciando carregamento do M3U');
    loadM3U();
});