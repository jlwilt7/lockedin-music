// Main Application Module
const App = {
    currentView: 'albums',
    musicData: { albums: [] },

    async init() {
        // Check authentication
        const isLoggedIn = await Auth.init();
        
        if (!isLoggedIn) {
            this.showAuthView();
            return;
        }

        this.showMainApp();
        await this.loadMusicData();
    },

    showAuthView() {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('main-container').classList.add('hidden');
        this.setupAuthHandlers();
    },

    showMainApp() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('main-container').classList.remove('hidden');
        
        // Update user info
        this.updateUserInfo();
        
        // Initialize player
        Player.init();
        
        // Setup navigation
        this.setupNavigation();
        
        // Setup upload handlers
        this.setupUploadHandlers();
    },

    updateUserInfo() {
        const displayName = Auth.getDisplayName();
        document.getElementById('user-display-name').textContent = displayName;
        document.getElementById('user-avatar').textContent = displayName.charAt(0).toUpperCase();
    },

    setupAuthHandlers() {
        // Tab switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
                document.getElementById('auth-error').classList.remove('show');
            });
        });

        // Login form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const btn = e.target.querySelector('button');
            
            try {
                btn.disabled = true;
                btn.innerHTML = '<span class="loading-spinner"></span>';
                document.getElementById('auth-error').classList.remove('show');
                
                await Auth.signIn(email, password);
                this.showMainApp();
                await this.loadMusicData();
            } catch (error) {
                document.getElementById('auth-error').textContent = error.message;
                document.getElementById('auth-error').classList.add('show');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Log In';
            }
        });

        // Signup form
        document.getElementById('signup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const btn = e.target.querySelector('button');
            
            try {
                btn.disabled = true;
                btn.innerHTML = '<span class="loading-spinner"></span>';
                document.getElementById('auth-error').classList.remove('show');
                
                await Auth.signUp(email, password, name);
                this.showStatus('Account created! Please check your email to verify.', 'success');
                
                // Switch to login tab
                document.querySelector('[data-tab="login"]').click();
            } catch (error) {
                document.getElementById('auth-error').textContent = error.message;
                document.getElementById('auth-error').classList.add('show');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Sign Up';
            }
        });

        // Logout button
        document.getElementById('logout-btn')?.addEventListener('click', async () => {
            await Auth.signOut();
            this.showAuthView();
        });
    },

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                if (!view) return;
                
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                
                document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
                document.getElementById(`${view}-view`)?.classList.add('active');
                
                this.currentView = view;
            });
        });

        // Logout button
        document.getElementById('logout-btn')?.addEventListener('click', async () => {
            await Auth.signOut();
            this.showAuthView();
        });
    },

    setupUploadHandlers() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        
        if (!uploadArea || !fileInput) return;

        // Click to upload
        uploadArea.addEventListener('click', () => fileInput.click());
        
        // File selection
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files);
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.handleFileUpload(e.dataTransfer.files);
            }
        });

        // Upload button
        document.getElementById('start-upload-btn')?.addEventListener('click', () => {
            this.processUploadQueue();
        });

        // Clear queue button
        document.getElementById('clear-queue-btn')?.addEventListener('click', () => {
            Upload.clearQueue();
            this.renderUploadQueue();
        });
    },

    async handleFileUpload(files) {
        await Upload.addToQueue(Array.from(files), (update) => {
            if (update.type === 'error') {
                this.showStatus(update.message, 'error');
            }
            this.renderUploadQueue();
        });
    },

    async processUploadQueue() {
        const btn = document.getElementById('start-upload-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="loading-spinner"></span> Uploading...';
        }

        await Upload.processQueue((update) => {
            this.renderUploadQueue();
            
            if (update.type === 'queue_complete') {
                this.showStatus('All uploads complete!', 'success');
                this.loadMusicData();
            } else if (update.type === 'error') {
                this.showStatus(`Error: ${update.message}`, 'error');
            }
        });

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Upload All';
        }
    },

    renderUploadQueue() {
        const container = document.getElementById('upload-queue-items');
        if (!container) return;

        if (Upload.queue.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No files in queue</p></div>';
            return;
        }

        container.innerHTML = Upload.queue.map(item => `
            <div class="upload-item" data-id="${item.id}">
                <div class="upload-item-cover">
                    ${item.metadata.coverArt 
                        ? `<img src="${item.metadata.coverArt}" alt="Cover">` 
                        : '♪'}
                </div>
                <div class="upload-item-info">
                    <div class="upload-item-title">${item.metadata.title}</div>
                    <div class="upload-item-meta">${item.metadata.artist} • ${item.metadata.album}</div>
                </div>
                ${item.status === 'uploading' 
                    ? `<div class="upload-progress"><div class="upload-progress-bar" style="width: ${item.progress}%"></div></div>`
                    : `<span class="upload-item-status ${item.status}">${this.getStatusText(item.status)}</span>`
                }
            </div>
        `).join('');
    },

    getStatusText(status) {
        const texts = {
            pending: 'Pending',
            uploading: 'Uploading...',
            complete: 'Complete',
            error: 'Error'
        };
        return texts[status] || status;
    },

    async loadMusicData() {
        try {
            this.showStatus('Loading music library...', 'info');
            const { supabase } = window.APP_CONFIG;
            
            // Get user ID from session
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;

            if (!userId) {
                console.log('No user session for loading music');
                this.showStatus('Please log in to view your music', 'info');
                return;
            }

            // Fetch albums with artist info
            const { data: albums, error: albumsError } = await supabase
                .from('albums')
                .select('*, artists(name)')
                .or(`user_id.eq.${userId},user_id.is.null`);

            if (albumsError) {
                console.error('Albums error:', albumsError);
                throw albumsError;
            }

            // Fetch tracks with album and artist info (without cover_url in nested select)
            const { data: tracks, error: tracksError } = await supabase
                .from('tracks')
                .select('*, albums(title), artists(name)')
                .or(`user_id.eq.${userId},user_id.is.null`)
                .order('album_id')
                .order('title');

            if (tracksError) {
                console.error('Tracks error:', tracksError);
                throw tracksError;
            }

            // Build music data structure
            this.musicData.albums = albums.map(album => ({
                id: album.id,
                title: album.title,
                artist: album.artists?.name || 'Unknown Artist',
                coverUrl: album.cover_url || null,
                songs: tracks
                    .filter(track => track.album_id === album.id)
                    .map(track => ({
                        id: track.id,
                        title: track.title,
                        artist: track.artists?.name || 'Unknown Artist',
                        album: track.albums?.title || 'Unknown Album',
                        duration: track.duration,
                        url: track.file_url,
                        coverUrl: album.cover_url || null
                    }))
            }));

            const allSongs = this.musicData.albums.flatMap(album => album.songs);

            if (allSongs.length === 0) {
                this.showStatus('No songs found. Upload some music to get started!', 'info');
            } else {
                this.showStatus(`Loaded ${allSongs.length} songs!`, 'success');
            }

            this.renderAlbums();
            this.renderSongs();
            this.renderAlbumSelect();
            Player.setSongs(allSongs);

        } catch (error) {
            console.error('Error loading music data:', error);
            this.showStatus('Error loading music library', 'error');
        }
    },

    renderAlbums() {
        const grid = document.getElementById('albums-grid');
        if (!grid) return;

        if (this.musicData.albums.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💿</div>
                    <h3>No Albums Yet</h3>
                    <p>Upload some music to see your albums here</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.musicData.albums.map(album => `
            <div class="album-card" data-album-id="${album.id}">
                <button class="delete-btn album-delete-btn" data-album-id="${album.id}" title="Delete Album">×</button>
                <div class="album-cover ${album.coverUrl ? 'has-image' : ''}">
                    ${album.coverUrl ? `<img src="${album.coverUrl}" alt="${album.title}">` : ''}
                    <div class="play-overlay"></div>
                </div>
                <div class="album-title">${album.title}</div>
                <div class="album-artist">${album.artist}</div>
            </div>
        `).join('');

        // Add click handlers for playing
        grid.querySelectorAll('.album-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't play if clicking delete button
                if (e.target.classList.contains('delete-btn')) return;
                
                const albumId = card.dataset.albumId;
                const album = this.musicData.albums.find(a => a.id === albumId);
                if (album && album.songs.length > 0) {
                    const allSongs = Player.allSongs;
                    const firstSongIndex = allSongs.findIndex(s => s.album === album.title);
                    if (firstSongIndex >= 0) {
                        Player.loadSong(firstSongIndex);
                        Player.play();
                    }
                }
            });
        });

        // Add delete handlers for albums
        grid.querySelectorAll('.album-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const albumId = btn.dataset.albumId;
                const album = this.musicData.albums.find(a => a.id === albumId);
                if (album && confirm(`Delete album "${album.title}" and all its songs?`)) {
                    await this.deleteAlbum(albumId);
                }
            });
        });
    },

    renderSongs() {
        const list = document.getElementById('songs-list');
        if (!list) return;

        const allSongs = this.musicData.albums.flatMap(album => album.songs);

        if (allSongs.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎵</div>
                    <h3>No Songs Yet</h3>
                    <p>Upload some music to see your songs here</p>
                </div>
            `;
            return;
        }

        list.innerHTML = `
            <div class="songs-list-header">
                <span>#</span>
                <span>Title</span>
                <span>Album</span>
                <span></span>
            </div>
            ${allSongs.map((song, index) => `
                <div class="song-item" data-index="${index}" data-song-id="${song.id}">
                    <div class="song-number">${index + 1}</div>
                    <div class="song-info">
                        <div class="song-title">${song.title}</div>
                        <div class="song-artist">${song.artist}</div>
                    </div>
                    <div class="song-album">${song.album}</div>
                    <div class="song-actions">
                        <span class="song-duration">${Player.formatTime(song.duration)}</span>
                        <button class="delete-btn song-delete-btn" data-song-id="${song.id}" title="Delete Song">×</button>
                    </div>
                </div>
            `).join('')}
        `;

        // Add click handlers for playing
        list.querySelectorAll('.song-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't play if clicking delete button
                if (e.target.classList.contains('delete-btn')) return;
                
                const index = parseInt(item.dataset.index);
                Player.loadSong(index);
                Player.play();
            });
        });

        // Add delete handlers for songs
        list.querySelectorAll('.song-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const songId = btn.dataset.songId;
                const song = allSongs.find(s => s.id === songId);
                if (song && confirm(`Delete "${song.title}"?`)) {
                    await this.deleteSong(songId);
                }
            });
        });
    },

    renderAlbumSelect() {
        const select = document.getElementById('album-select');
        if (!select) return;

        select.innerHTML = `
            <option value="">Create new album...</option>
            ${this.musicData.albums.map(album => `
                <option value="${album.id}">${album.title} - ${album.artist}</option>
            `).join('')}
        `;
    },

    showStatus(message, type = 'info') {
        const statusEl = document.createElement('div');
        statusEl.className = `status-message ${type}`;
        statusEl.textContent = message;
        document.body.appendChild(statusEl);
        setTimeout(() => statusEl.remove(), 3000);
    },

    // Delete a single song
    async deleteSong(songId) {
        try {
            const { supabase } = window.APP_CONFIG;
            
            // Get the track info first (to delete from storage)
            const { data: track } = await supabase
                .from('tracks')
                .select('file_url')
                .eq('id', songId)
                .single();

            // Delete from database
            const { error } = await supabase
                .from('tracks')
                .delete()
                .eq('id', songId);

            if (error) throw error;

            // Try to delete from storage (extract path from URL)
            if (track?.file_url) {
                try {
                    const url = new URL(track.file_url);
                    const pathParts = url.pathname.split('/storage/v1/object/public/music/');
                    if (pathParts[1]) {
                        await supabase.storage.from('music').remove([decodeURIComponent(pathParts[1])]);
                    }
                } catch (e) {
                    console.warn('Could not delete file from storage:', e);
                }
            }

            this.showStatus('Song deleted', 'success');
            await this.loadMusicData();
        } catch (error) {
            console.error('Error deleting song:', error);
            this.showStatus('Failed to delete song', 'error');
        }
    },

    // Delete an album and all its songs
    async deleteAlbum(albumId) {
        try {
            const { supabase } = window.APP_CONFIG;

            // Get all tracks in this album (to delete from storage)
            const { data: tracks } = await supabase
                .from('tracks')
                .select('file_url')
                .eq('album_id', albumId);

            // Delete all tracks in the album from database
            const { error: tracksError } = await supabase
                .from('tracks')
                .delete()
                .eq('album_id', albumId);

            if (tracksError) throw tracksError;

            // Delete the album from database
            const { error: albumError } = await supabase
                .from('albums')
                .delete()
                .eq('id', albumId);

            if (albumError) throw albumError;

            // Try to delete files from storage
            if (tracks && tracks.length > 0) {
                const filePaths = tracks.map(track => {
                    try {
                        const url = new URL(track.file_url);
                        const pathParts = url.pathname.split('/storage/v1/object/public/music/');
                        return pathParts[1] ? decodeURIComponent(pathParts[1]) : null;
                    } catch {
                        return null;
                    }
                }).filter(Boolean);

                if (filePaths.length > 0) {
                    await supabase.storage.from('music').remove(filePaths);
                }
            }

            this.showStatus('Album deleted', 'success');
            await this.loadMusicData();
        } catch (error) {
            console.error('Error deleting album:', error);
            this.showStatus('Failed to delete album', 'error');
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

window.App = App;

