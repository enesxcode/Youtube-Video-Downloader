from flask import Flask, render_template, request, jsonify, send_file
import yt_dlp
import os
import uuid
from urllib.parse import unquote
from datetime import timedelta

app = Flask(__name__)
app.config['DOWNLOAD_FOLDER'] = 'downloads'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB limit

if not os.path.exists(app.config['DOWNLOAD_FOLDER']):
    os.makedirs(app.config['DOWNLOAD_FOLDER'])

def sanitize_filename(filename):
    keepchars = (' ', '.', '_', '-')
    return "".join(c for c in filename if c.isalnum() or c in keepchars).rstrip()

def format_duration(seconds):
    return str(timedelta(seconds=seconds))

def get_video_info(url):
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
            
            # Get available formats
            formats = []
            for f in info.get('formats', []):
                if f.get('filesize') or f.get('filesize_approx'):
                    format_info = {
                        'format_id': f['format_id'],
                        'ext': f.get('ext', 'unknown'),
                        'resolution': f.get('resolution', 'unknown'),
                        'fps': f.get('fps'),
                        'filesize': f.get('filesize') or f.get('filesize_approx'),
                        'vcodec': f.get('vcodec', 'none'),
                        'acodec': f.get('acodec', 'none'),
                        'format_note': f.get('format_note', ''),
                    }
                    formats.append(format_info)
            
            # Sort formats by quality
            formats.sort(key=lambda x: (
                0 if 'video' in x['vcodec'] else 1,
                -1 * int(x['resolution'].split('p')[0]) if x['resolution'] != 'unknown' and 'p' in x['resolution'] else 0,
                x['filesize'] or 0
            ))
            
            return {
                'success': True,
                'info': {
                    'id': info['id'],
                    'title': info['title'],
                    'thumbnail': info['thumbnail'],
                    'duration': format_duration(info.get('duration', 0)),
                    'uploader': info.get('uploader', 'Unknown'),
                    'upload_date': info.get('upload_date', ''),
                    'view_count': info.get('view_count', 0),
                    'like_count': info.get('like_count', 0),
                    'categories': info.get('categories', []),
                    'tags': info.get('tags', []),
                    'description': info.get('description', ''),
                    'formats': formats,
                }
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyize():
    data = request.json
    url = data.get('url')
    
    if not url:
        return jsonify({'success': False, 'error': 'No URL provided'}), 400
    
    return jsonify(get_video_info(url))

@app.route('/download', methods=['POST'])
def download():
    data = request.json
    url = data.get('url')
    format_id = data.get('format_id')
    download_type = data.get('type', 'video')
    
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'outtmpl': os.path.join(app.config['DOWNLOAD_FOLDER'], '%(id)s.%(ext)s'),
            'format': format_id if format_id else ('bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best' if download_type == 'video' else 'bestaudio/best'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
            }] if download_type == 'audio' else [],
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            video_id = info['id']
            file_ext = 'mp3' if download_type == 'audio' else info['ext']
            filename = f"{video_id}.{file_ext}"
            
            # Download the file
            ydl.download([url])
            
            # Get the actual filename
            actual_filename = None
            for f in os.listdir(app.config['DOWNLOAD_FOLDER']):
                if f.startswith(video_id):
                    actual_filename = f
                    break
            
            if not actual_filename:
                raise Exception("Downloaded file not found")
            
            return jsonify({
                'success': True,
                'filename': actual_filename,
                'title': sanitize_filename(info['title']),
                'type': download_type,
                'format_id': format_id
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/download-file/<filename>')
def download_file(filename):
    safe_filename = unquote(filename)
    return send_file(
        os.path.join(app.config['DOWNLOAD_FOLDER'], safe_filename),
        as_attachment=True,
        download_name=safe_filename
    )

if __name__ == '__main__':
    app.run(debug=True)