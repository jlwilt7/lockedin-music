// Music Player Module
const Player = {
    audio: null,
    currentSongIndex: 0,
    allSongs: [],
    isPlaying: false,
    currentVolume: 70,
    shuffle: false,
    repeat: 'none', // 'none', 'all', 'one'

    // DOM Elements
    elements: {},

    init() {
        this.audio = document.getElementById('audio-player');
        this.cacheElements();
        this.setupEventListeners();
        this.updateVolume();
    },

    cacheElements() {
        this.elements = {
            playBtn: document.getElementById('play-btn'),
            playIcon: document.getElementById('play-icon'),
            pauseIcon: document.getElementById('pause-icon'),
            prevBtn: document.getElementById('prev-btn'),
            nextBtn: document.getElementById('next-btn'),
            progressBar: document.getElementById('progress-bar'),
            progressFill: document.getElementById('progress-fill'),
            currentTime: document.getElementById('current-time'),
            totalTime: document.getElementById('total-time'),
            volumeBtn: document.getElementById('volume-btn'),
            volumeSlider: document.getElementById('volume-slider'),
            volumeHighIcon: document.getElementById('volume-high-icon'),
            volumeMuteIcon: document.getElementById('volume-mute-icon'),
            playerTitle: document.getElementById('player-title'),
            playerArtist: document.getElementById('player-artist'),
            playerCover: document.getElementById('player-cover')
        };
    },

    setupEventListeners() {
        // Control buttons
        this.elements.playBtn?.addEventListener('click', () => this.togglePlayPause());
        this.elements.prevBtn?.addEventListener('click', () => this.previousSong());
        this.elements.nextBtn?.addEventListener('click', () => this.nextSong());
        
        // Progress bar
        this.elements.progressBar?.addEventListener('click', (e) => this.setProgress(e));
        
        // Volume
        this.elements.volumeSlider?.addEventListener('input', () => this.updateVolume());
        this.elements.volumeBtn?.addEventListener('click', () => this.toggleMute());

        // Audio events
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
        this.audio.addEventListener('ended', () => this.onSongEnded());
        this.audio.addEventListener('error', (e) => this.onError(e));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    },

    setSongs(songs) {
        this.allSongs = songs;
        if (songs.length > 0) {
            this.loadSong(0);
        }
        this.updateNavigationButtons();
    },

    loadSong(index) {
        if (index < 0 || index >= this.allSongs.length) return;
        
        this.currentSongIndex = index;
        const song = this.allSongs[index];
        
        this.audio.src = song.url;
        this.elements.playerTitle.textContent = song.title;
        this.elements.playerArtist.textContent = song.artist;
        
        // Update cover if available
        if (this.elements.playerCover) {
            if (song.coverUrl) {
                this.elements.playerCover.innerHTML = `<img src="${song.coverUrl}" alt="Cover">`;
            } else {
                this.elements.playerCover.innerHTML = '♪';
            }
        }
        
        this.updateNavigationButtons();
        this.updateSongListHighlight();
    },

    play() {
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.elements.playIcon.style.display = 'none';
            this.elements.pauseIcon.style.display = 'block';
        }).catch(err => {
            console.error('Playback error:', err);
            App.showStatus('Error playing audio', 'error');
        });
    },

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.elements.playIcon.style.display = 'block';
        this.elements.pauseIcon.style.display = 'none';
    },

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    },

    previousSong() {
        if (this.currentSongIndex > 0) {
            this.loadSong(this.currentSongIndex - 1);
            if (this.isPlaying) this.play();
        }
    },

    nextSong() {
        if (this.shuffle) {
            const nextIndex = Math.floor(Math.random() * this.allSongs.length);
            this.loadSong(nextIndex);
        } else if (this.currentSongIndex < this.allSongs.length - 1) {
            this.loadSong(this.currentSongIndex + 1);
        }
        if (this.isPlaying) this.play();
    },

    updateNavigationButtons() {
        if (this.elements.prevBtn) {
            this.elements.prevBtn.disabled = this.currentSongIndex === 0;
        }
        if (this.elements.nextBtn) {
            this.elements.nextBtn.disabled = this.currentSongIndex === this.allSongs.length - 1 && !this.shuffle;
        }
    },

    updateSongListHighlight() {
        const songsList = document.getElementById('songs-list');
        if (!songsList) return;
        
        const items = songsList.querySelectorAll('.song-item');
        items.forEach((item, index) => {
            item.classList.toggle('active', index === this.currentSongIndex);
        });
    },

    updateProgress() {
        if (this.audio.duration) {
            const percent = (this.audio.currentTime / this.audio.duration) * 100;
            this.elements.progressFill.style.width = percent + '%';
            this.elements.currentTime.textContent = this.formatTime(this.audio.currentTime);
        }
    },

    setProgress(e) {
        const rect = this.elements.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.audio.currentTime = percent * this.audio.duration;
    },

    updateVolume() {
        this.currentVolume = parseInt(this.elements.volumeSlider.value);
        this.audio.volume = this.currentVolume / 100;
        this.elements.volumeSlider.style.setProperty('--volume-percent', this.currentVolume + '%');

        if (this.currentVolume === 0) {
            this.elements.volumeHighIcon.style.display = 'none';
            this.elements.volumeMuteIcon.style.display = 'block';
        } else {
            this.elements.volumeHighIcon.style.display = 'block';
            this.elements.volumeMuteIcon.style.display = 'none';
        }
    },

    toggleMute() {
        if (this.currentVolume > 0) {
            this.elements.volumeSlider.value = 0;
        } else {
            this.elements.volumeSlider.value = 70;
        }
        this.updateVolume();
    },

    onLoadedMetadata() {
        this.elements.totalTime.textContent = this.formatTime(this.audio.duration);
    },

    onSongEnded() {
        if (this.repeat === 'one') {
            this.audio.currentTime = 0;
            this.play();
        } else if (this.currentSongIndex < this.allSongs.length - 1) {
            this.nextSong();
        } else if (this.repeat === 'all') {
            this.loadSong(0);
            this.play();
        } else {
            this.pause();
        }
    },

    onError(e) {
        console.error('Audio error:', this.audio.error);
        App.showStatus('Error loading audio file', 'error');
    },

    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.audio.currentTime = Math.min(this.audio.duration, this.audio.currentTime + 10);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.elements.volumeSlider.value = Math.min(100, this.currentVolume + 10);
                this.updateVolume();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.elements.volumeSlider.value = Math.max(0, this.currentVolume - 10);
                this.updateVolume();
                break;
        }
    },

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    toggleShuffle() {
        this.shuffle = !this.shuffle;
        return this.shuffle;
    },

    toggleRepeat() {
        const modes = ['none', 'all', 'one'];
        const currentIndex = modes.indexOf(this.repeat);
        this.repeat = modes[(currentIndex + 1) % modes.length];
        return this.repeat;
    }
};

window.Player = Player;

