document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const analyzeBtn = document.getElementById('analyze-btn');
    const youtubeUrl = document.getElementById('youtube-url');
    const videoInfoContainer = document.getElementById('video-info-container');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const loadingSpinner = document.getElementById('loading-spinner');
    const downloadResult = document.getElementById('download-result');
    const newDownloadBtn = document.getElementById('new-download-btn');
    
    // Video info elements
    const videoThumbnail = document.getElementById('video-thumbnail');
    const videoTitle = document.getElementById('video-title');
    const videoUploader = document.getElementById('video-uploader');
    const videoDate = document.getElementById('video-date');
    const videoViews = document.getElementById('video-views');
    const videoDuration = document.getElementById('video-duration');
    
    // Format tables
    const videoFormatsList = document.getElementById('video-formats-list');
    const audioFormatsList = document.getElementById('audio-formats-list');
    
    // Tabs
    const videoTab = document.getElementById('video-tab');
    const audioTab = document.getElementById('audio-tab');
    const videoFormatsContent = document.getElementById('video-formats');
    const audioFormatsContent = document.getElementById('audio-formats');
    
    // Download link
    const downloadLink = document.getElementById('download-link');
    
    // Current video data
    let currentVideoData = null;
    
    // Tab switching
    videoTab.addEventListener('click', function() {
        videoTab.classList.add('active');
        audioTab.classList.remove('active');
        videoFormatsContent.classList.remove('hidden');
        audioFormatsContent.classList.add('hidden');
    });
    
    audioTab.addEventListener('click', function() {
        audioTab.classList.add('active');
        videoTab.classList.remove('active');
        audioFormatsContent.classList.remove('hidden');
        videoFormatsContent.classList.add('hidden');
    });
    
    // Analyze button click
    analyzeBtn.addEventListener('click', function() {
        const url = youtubeUrl.value.trim();
        
        if (!url) {
            showError('Please enter a YouTube URL');
            return;
        }
        
        if (!isValidYouTubeUrl(url)) {
            showError('Please enter a valid YouTube URL');
            return;
        }
        
        analyzeVideo(url);
    });
    
    // New download button
    newDownloadBtn.addEventListener('click', function() {
        resetUI();
    });
    
    // Enter key in input field
    youtubeUrl.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            analyzeBtn.click();
        }
    });
    
    // Functions
    function isValidYouTubeUrl(url) {
        return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/.test(url);
    }
    
    function formatFileSize(bytes) {
        if (!bytes) return 'Unknown';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
        return (bytes / 1073741824).toFixed(1) + ' GB';
    }
    
    function formatDate(dateStr) {
        if (!dateStr || dateStr.length !== 8) return 'Unknown';
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return `${year}-${month}-${day}`;
    }
    
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    
    function analyzeVideo(url) {
        // Show loading, hide other sections
        loadingSpinner.classList.remove('hidden');
        videoInfoContainer.classList.add('hidden');
        errorContainer.classList.add('hidden');
        downloadResult.classList.add('hidden');
        
        // Send request to backend
        fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: url
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then(data => {
            loadingSpinner.classList.add('hidden');
            
            if (data.success) {
                currentVideoData = data.info;
                displayVideoInfo(data.info);
                displayFormats(data.info.formats);
                videoInfoContainer.classList.remove('hidden');
            } else {
                showError(data.error || 'An unknown error occurred');
            }
        })
        .catch(error => {
            loadingSpinner.classList.add('hidden');
            showError(error.error || 'Network error. Please try again.');
            console.error('Error:', error);
        });
    }
    
    function displayVideoInfo(info) {
        videoThumbnail.src = info.thumbnail;
        videoTitle.textContent = info.title;
        videoUploader.textContent = info.uploader;
        videoDate.textContent = formatDate(info.upload_date);
        videoViews.textContent = formatNumber(info.view_count);
        videoDuration.textContent = info.duration;
    }
    
    function displayFormats(formats) {
        // Clear existing formats
        videoFormatsList.innerHTML = '';
        audioFormatsList.innerHTML = '';
        
        // Separate video and audio formats
        const videoFormats = [];
        const audioFormats = [];
        
        formats.forEach(format => {
            if (format.vcodec !== 'none') {
                videoFormats.push(format);
            } else if (format.acodec !== 'none') {
                audioFormats.push(format);
            }
        });
        
        // Display video formats
        videoFormats.forEach(format => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-800/50';
            
            row.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="font-medium">${format.resolution}</span>
                    ${format.fps ? `<span class="text-gray-400 text-sm ml-1">${format.fps}fps</span>` : ''}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-gray-400">
                    ${format.ext.toUpperCase()} • ${format.format_note || format.vcodec?.split('.')[0] || ''}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                    ${formatFileSize(format.filesize)}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <button 
                        class="download-format-btn bg-primary hover:bg-primary-dark text-white px-4 py-1 rounded text-sm"
                        data-format-id="${format.format_id}"
                        data-type="video"
                    >
                        Download
                    </button>
                </td>
            `;
            
            videoFormatsList.appendChild(row);
        });
        
        // Display audio formats
        audioFormats.forEach(format => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-800/50';
            
            row.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap font-medium">
                    ${format.ext.toUpperCase()}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-gray-400">
                    ${format.acodec?.split('.')[0] || ''}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                    ${formatFileSize(format.filesize)}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <button 
                        class="download-format-btn bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded text-sm"
                        data-format-id="${format.format_id}"
                        data-type="audio"
                    >
                        Download
                    </button>
                </td>
            `;
            
            audioFormatsList.appendChild(row);
        });
        
        // Add event listeners to download buttons
        document.querySelectorAll('.download-format-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const formatId = this.dataset.formatId;
                const type = this.dataset.type;
                downloadVideo(currentVideoData.id, formatId, type);
            });
        });
    }
    
    function downloadVideo(videoId, formatId, type) {
        loadingSpinner.classList.remove('hidden');
        videoInfoContainer.classList.add('hidden');
        
        fetch('/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: `https://www.youtube.com/watch?v=${videoId}`,
                format_id: formatId,
                type: type
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then(data => {
            loadingSpinner.classList.add('hidden');
            
            if (data.success) {
                // Set download link
                const cleanTitle = currentVideoData.title.replace(/[^\w\s.-]/gi, '');
                const fileExtension = data.type === 'audio' ? 'mp3' : 'mp4';
                downloadLink.href = `/download-file/${data.filename}`;
                downloadLink.download = `${cleanTitle}.${fileExtension}`;
                
                // Show download result
                downloadResult.classList.remove('hidden');
            } else {
                showError(data.error || 'Download failed');
                videoInfoContainer.classList.remove('hidden');
            }
        })
        .catch(error => {
            loadingSpinner.classList.add('hidden');
            showError(error.error || 'Download failed. Please try again.');
            videoInfoContainer.classList.remove('hidden');
            console.error('Error:', error);
        });
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorContainer.classList.remove('hidden');
        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    function resetUI() {
        youtubeUrl.value = '';
        videoInfoContainer.classList.add('hidden');
        errorContainer.classList.add('hidden');
        downloadResult.classList.add('hidden');
        youtubeUrl.focus();
    }
});