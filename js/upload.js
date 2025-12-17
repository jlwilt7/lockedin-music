// Upload and Metadata Parsing Module
const Upload = {
    queue: [],
    isProcessing: false,

    // Parse audio metadata from file
    async parseMetadata(file) {
        return new Promise((resolve, reject) => {
            // Use jsmediatags library for metadata extraction
            if (window.jsmediatags) {
                window.jsmediatags.read(file, {
                    onSuccess: (tag) => {
                        const tags = tag.tags;
                        let coverArt = null;

                        // Extract album art if available
                        if (tags.picture) {
                            const { data, format } = tags.picture;
                            const base64 = this.arrayBufferToBase64(data);
                            coverArt = `data:${format};base64,${base64}`;
                        }

                        resolve({
                            title: tags.title || this.cleanFileName(file.name),
                            artist: tags.artist || 'Unknown Artist',
                            album: tags.album || 'Unknown Album',
                            year: tags.year || null,
                            genre: tags.genre || null,
                            trackNumber: tags.track || null,
                            coverArt: coverArt,
                            duration: null // Will be set by audio element
                        });
                    },
                    onError: (error) => {
                        console.warn('Metadata parsing error:', error);
                        // Fallback to basic info
                        resolve({
                            title: this.cleanFileName(file.name),
                            artist: 'Unknown Artist',
                            album: 'Unknown Album',
                            year: null,
                            genre: null,
                            trackNumber: null,
                            coverArt: null,
                            duration: null
                        });
                    }
                });
            } else {
                // Fallback if jsmediatags not loaded
                resolve({
                    title: this.cleanFileName(file.name),
                    artist: 'Unknown Artist',
                    album: 'Unknown Album',
                    year: null,
                    genre: null,
                    trackNumber: null,
                    coverArt: null,
                    duration: null
                });
            }
        });
    },

    // Get audio duration
    async getAudioDuration(file) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.preload = 'metadata';
            
            audio.onloadedmetadata = () => {
                URL.revokeObjectURL(audio.src);
                resolve(Math.round(audio.duration));
            };
            
            audio.onerror = () => {
                URL.revokeObjectURL(audio.src);
                resolve(0);
            };
            
            audio.src = URL.createObjectURL(file);
        });
    },

    // Clean filename for use as title
    cleanFileName(filename) {
        return filename
            .replace(/\.[^/.]+$/, '') // Remove extension
            .replace(/^\d+[\.\-\s]+/, '') // Remove track numbers
            .replace(/_/g, ' ')
            .trim();
    },

    // Convert array buffer to base64
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },

    // Convert base64 to blob for upload
    base64ToBlob(base64, contentType) {
        const byteCharacters = atob(base64.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: contentType });
    },

    // Add files to upload queue
    async addToQueue(files, onUpdate) {
        for (const file of files) {
            // Validate file type
            if (!this.isValidAudioFile(file)) {
                if (onUpdate) onUpdate({ type: 'error', message: `${file.name} is not a valid audio file` });
                continue;
            }

            // Parse metadata
            const metadata = await this.parseMetadata(file);
            const duration = await this.getAudioDuration(file);
            metadata.duration = duration;

            const queueItem = {
                id: crypto.randomUUID(),
                file: file,
                metadata: metadata,
                status: 'pending',
                progress: 0,
                error: null
            };

            this.queue.push(queueItem);
            if (onUpdate) onUpdate({ type: 'added', item: queueItem });
        }
    },

    // Check if file is valid audio
    isValidAudioFile(file) {
        const validTypes = [
            'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/wav', 
            'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/x-m4a',
            'audio/mp4', 'audio/x-flac'
        ];
        const validExtensions = ['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a'];
        
        const hasValidType = validTypes.includes(file.type);
        const hasValidExtension = validExtensions.some(ext => 
            file.name.toLowerCase().endsWith(ext)
        );
        
        return hasValidType || hasValidExtension;
    },

    // Upload a single file to Supabase storage
    async uploadFile(queueItem, onProgress) {
        const { supabase } = window.APP_CONFIG;
        const userId = Auth.getUserId();
        
        if (!userId) throw new Error('User not authenticated');

        // Generate unique filename
        const ext = queueItem.file.name.split('.').pop();
        const filename = `${userId}/${crypto.randomUUID()}.${ext}`;

        // Upload audio file
        const { data: audioData, error: audioError } = await supabase.storage
            .from('music')
            .upload(filename, queueItem.file, {
                cacheControl: '3600',
                upsert: false
            });

        if (audioError) throw audioError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('music')
            .getPublicUrl(filename);

        // Upload cover art if available
        let coverUrl = null;
        if (queueItem.metadata.coverArt) {
            try {
                const coverFilename = `${userId}/covers/${crypto.randomUUID()}.jpg`;
                const coverBlob = this.base64ToBlob(queueItem.metadata.coverArt, 'image/jpeg');
                
                const { error: coverError } = await supabase.storage
                    .from('music')
                    .upload(coverFilename, coverBlob, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (!coverError) {
                    const { data: { publicUrl: coverPublicUrl } } = supabase.storage
                        .from('music')
                        .getPublicUrl(coverFilename);
                    coverUrl = coverPublicUrl;
                }
            } catch (e) {
                console.warn('Failed to upload cover art:', e);
            }
        }

        return {
            fileUrl: publicUrl,
            coverUrl: coverUrl
        };
    },

    // Get or create artist
    async getOrCreateArtist(name) {
        const { supabase } = window.APP_CONFIG;
        
        // Get user ID from current session (more reliable)
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        
        console.log('Creating artist - User ID:', userId, 'Artist Name:', name);
        
        if (!userId) {
            throw new Error('No authenticated user found. Please log in again.');
        }

        // Check if artist exists
        const { data: existing, error: selectError } = await supabase
            .from('artists')
            .select('id')
            .eq('name', name)
            .eq('user_id', userId)
            .maybeSingle();

        if (selectError) {
            console.error('Error checking existing artist:', selectError);
        }

        if (existing) return existing.id;

        // Create new artist
        const { data: newArtist, error } = await supabase
            .from('artists')
            .insert({ name, user_id: userId })
            .select('id')
            .single();

        if (error) {
            console.error('Error creating artist:', error);
            throw error;
        }
        return newArtist.id;
    },

    // Get or create album
    async getOrCreateAlbum(title, artistId, coverUrl) {
        const { supabase } = window.APP_CONFIG;
        
        // Get user ID from current session
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        
        console.log('Creating album - User ID:', userId, 'Album:', title);

        if (!userId) {
            throw new Error('No authenticated user found. Please log in again.');
        }

        // Check if album exists
        const { data: existing, error: selectError } = await supabase
            .from('albums')
            .select('id')
            .eq('title', title)
            .eq('artist_id', artistId)
            .eq('user_id', userId)
            .maybeSingle();

        if (selectError) {
            console.error('Error checking existing album:', selectError);
        }

        if (existing) return existing.id;

        // Create new album
        const albumData = { 
            title, 
            artist_id: artistId, 
            user_id: userId 
        };
        if (coverUrl) albumData.cover_url = coverUrl;

        const { data: newAlbum, error } = await supabase
            .from('albums')
            .insert(albumData)
            .select('id')
            .single();

        if (error) {
            console.error('Error creating album:', error);
            throw error;
        }
        return newAlbum.id;
    },

    // Create track in database
    async createTrack(metadata, artistId, albumId, fileUrl) {
        const { supabase } = window.APP_CONFIG;
        
        // Get user ID from current session
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        
        console.log('Creating track - User ID:', userId, 'Track:', metadata.title);

        if (!userId) {
            throw new Error('No authenticated user found. Please log in again.');
        }

        const { data, error } = await supabase
            .from('tracks')
            .insert({
                title: metadata.title,
                artist_id: artistId,
                album_id: albumId,
                duration: metadata.duration,
                file_url: fileUrl,
                user_id: userId
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating track:', error);
            throw error;
        }
        return data;
    },

    // Process entire upload queue
    async processQueue(onUpdate) {
        if (this.isProcessing || this.queue.length === 0) return;
        
        this.isProcessing = true;

        for (const item of this.queue) {
            if (item.status !== 'pending') continue;

            try {
                item.status = 'uploading';
                if (onUpdate) onUpdate({ type: 'status', item });

                // Upload file
                const { fileUrl, coverUrl } = await this.uploadFile(item);
                item.progress = 50;
                if (onUpdate) onUpdate({ type: 'progress', item });

                // Get or create artist
                const artistId = await this.getOrCreateArtist(item.metadata.artist);
                item.progress = 70;
                if (onUpdate) onUpdate({ type: 'progress', item });

                // Get or create album
                const albumId = await this.getOrCreateAlbum(
                    item.metadata.album, 
                    artistId, 
                    coverUrl
                );
                item.progress = 85;
                if (onUpdate) onUpdate({ type: 'progress', item });

                // Create track
                await this.createTrack(item.metadata, artistId, albumId, fileUrl);
                
                item.status = 'complete';
                item.progress = 100;
                if (onUpdate) onUpdate({ type: 'complete', item });

            } catch (error) {
                console.error('Upload error:', error);
                item.status = 'error';
                item.error = error.message;
                if (onUpdate) onUpdate({ type: 'error', item, message: error.message });
            }
        }

        this.isProcessing = false;
        if (onUpdate) onUpdate({ type: 'queue_complete' });
    },

    // Clear completed items from queue
    clearCompleted() {
        this.queue = this.queue.filter(item => 
            item.status !== 'complete' && item.status !== 'error'
        );
    },

    // Clear entire queue
    clearQueue() {
        this.queue = [];
    },

    // Remove item from queue
    removeFromQueue(id) {
        this.queue = this.queue.filter(item => item.id !== id);
    }
};

window.Upload = Upload;

