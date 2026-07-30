import React, { useRef, useState, useEffect } from 'react';
import { Camera as CameraIcon, Square, Download, Settings, Github } from 'lucide-react';
import './App.css';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(0);

  const [asciiArt, setAsciiArt] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState('');
  const [fps, setFps] = useState(0);
  const [dimensions, setDimensions] = useState({ cols: 0, rows: 0 });

  const [charSet, setCharSet] = useState('@%#*+=-:. ');
  const [resolution, setResolution] = useState(6);
  const [fontSize, setFontSize] = useState(8);
  const [color, setColor] = useState('#00ff00');
  const [invert, setInvert] = useState(true);
  const [showStats, setShowStats] = useState(true);

  const charSets = {
    standard: '@%#*+=-:. ',
    blocks: '█▓▒░ ',
    detailed: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,^`. ',
    simple: '@#%*+=-. ',
    binary: '01 '
  };

  const colors = [
    { name: 'Green', value: '#00ff00' },
    { name: 'Cyan', value: '#00ffff' },
    { name: 'White', value: '#ffffff' },
    { name: 'Yellow', value: '#ffff00' },
    { name: 'Magenta', value: '#ff00ff' },
    { name: 'Red', value: '#ff6b6b' }
  ];

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsActive(true);
        setError('');
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
    setAsciiArt('');
    setFps(0);
  };

  const convertToAscii = (timestamp) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(convertToAscii);
      return;
    }

    frameCountRef.current++;
    if (timestamp - lastTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastTimeRef.current = timestamp;
    }

    const ctx = canvas.getContext('2d');
    const charHeight = resolution * 2;
    const cols = Math.floor(video.videoWidth / resolution);
    const rows = Math.floor(video.videoHeight / charHeight);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    let ascii = '';

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let brightnessSum = 0;
        let pixelCount = 0;

        for (let py = 0; py < charHeight; py++) {
          for (let px = 0; px < resolution; px++) {
            const imgX = x * resolution + px;
            const imgY = y * charHeight + py;

            if (imgX < canvas.width && imgY < canvas.height) {
              const index = (imgY * canvas.width + imgX) * 4;
              const r = pixels[index];
              const g = pixels[index + 1];
              const b = pixels[index + 2];

              const brightness = (r + g + b) / 3;
              brightnessSum += brightness;
              pixelCount++;
            }
          }
        }

        let avgBrightness = brightnessSum / pixelCount;
        if (invert) avgBrightness = 255 - avgBrightness;

        const charIndex = Math.floor((avgBrightness / 255) * (charSet.length - 1));
        ascii += charSet[charIndex];
      }
      ascii += '\n';
    }

    setAsciiArt(ascii);
    setDimensions({ cols, rows });
    animationRef.current = requestAnimationFrame(convertToAscii);
  };

  useEffect(() => {
    let mounted = true;
    let timer;

    if (isActive && mounted) {
      timer = setTimeout(() => {
        if (mounted) convertToAscii(0);
      }, 100);
    }

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isActive, charSet, resolution, invert]);

  const downloadFrame = () => {
    if (!asciiArt) return;
    const blob = new Blob([asciiArt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ascii-frame-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <CameraIcon size={28} strokeWidth={2} />
            <div>
              <h1>ASCII Camera</h1>
              <p>Real-time webcam to ASCII art converter</p>
            </div>
          </div>
          <a 
            href="https://github.com/sushil825/ascii-camera" 
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
          >
            <Github size={18} />
            <span>GitHub</span>
          </a>
        </div>
      </header>

      <div className="container">
        {error && <div className="error-banner">{error}</div>}

        <div className="main-grid">
          <aside className="controls-panel">
            <h2>
              <Settings size={18} />
              Controls
            </h2>

            <div className="control-section">
              {!isActive ? (
                <button onClick={startCamera} className="btn-start">
                  <CameraIcon size={18} />
                  Start Camera
                </button>
              ) : (
                <>
                  <button onClick={stopCamera} className="btn-stop">
                    <Square size={18} />
                    Stop Camera
                  </button>
                  <button onClick={downloadFrame} className="btn-download">
                    <Download size={16} />
                    Download Frame
                  </button>
                </>
              )}
            </div>

            <div className="control-section">
              <label>Character Set</label>
              <select
                value={Object.keys(charSets).find(key => charSets[key] === charSet)}
                onChange={(e) => setCharSet(charSets[e.target.value])}
              >
                <option value="standard">Standard</option>
                <option value="blocks">Blocks</option>
                <option value="detailed">Detailed</option>
                <option value="simple">Simple</option>
                <option value="binary">Binary</option>
              </select>
            </div>

            <div className="control-section">
              <label>Resolution: {resolution}x{resolution * 2}px</label>
              <input
                type="range"
                min="4"
                max="12"
                step="2"
                value={resolution}
                onChange={(e) => setResolution(parseInt(e.target.value))}
              />
            </div>

            <div className="control-section">
              <label>Font Size: {fontSize}px</label>
              <input
                type="range"
                min="4"
                max="14"
                step="1"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
              />
            </div>

            <div className="control-section">
              <label>Color Theme</label>
              <div className="color-grid">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`color-btn ${color === c.value ? 'active' : ''}`}
                    style={{ background: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="control-section">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={invert}
                  onChange={(e) => setInvert(e.target.checked)}
                />
                Invert Colors
              </label>
            </div>

            <div className="control-section">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showStats}
                  onChange={(e) => setShowStats(e.target.checked)}
                />
                Show Stats
              </label>
            </div>

            {showStats && isActive && (
              <div className="stats-panel">
                <h3>Performance</h3>
                <div className="stat-row">
                  <span className="stat-label">FPS</span>
                  <span className="stat-value">{fps}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Resolution</span>
                  <span className="stat-value">{dimensions.cols}×{dimensions.rows}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Characters</span>
                  <span className="stat-value">{(dimensions.cols * dimensions.rows).toLocaleString()}</span>
                </div>
              </div>
            )}
          </aside>

          <main className="display-area">
            <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {asciiArt ? (
              <div className="ascii-output">
                <pre style={{
                  color: color,
                  fontSize: `${fontSize}px`,
                  lineHeight: `${fontSize}px`
                }}>
                  {asciiArt}
                </pre>
              </div>
            ) : (
              <div className="placeholder">
                <div className="placeholder-icon">
                  <CameraIcon size={80} strokeWidth={1.5} />
                </div>
                <h3>Click "Start Camera" to begin</h3>
                <p>Allow camera permissions when prompted</p>
              </div>
            )}
          </main>
        </div>
      </div>

      <footer className="footer">
        <p>Built with React • Open Source</p>
        <p>Made with ❤️</p>
      </footer>
    </div>
  );
}

export default App;