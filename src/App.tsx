import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { BookPreview } from './components/BookPreview';
import './index.css';

function App() {
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      alert('テキストを入力してください');
      return;
    }

    if (!previewRef.current) return;

    try {
      setIsGenerating(true);

      // Wait a tiny bit to ensure DOM is fully updated and fonts are ready
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(previewRef.current, {
        scale: 2, // High resolution capture
        useCORS: true,
        backgroundColor: '#000000', // Solid background just in case, ensuring no alpha transparency issues
      });

      // Target max height: 1000px
      const targetHeight = 1000;
      // Calculate proportional width
      const targetWidth = Math.round((canvas.width / canvas.height) * targetHeight);

      // Create a new canvas to resize the image
      const resizedCanvas = document.createElement('canvas');
      resizedCanvas.width = targetWidth;
      resizedCanvas.height = targetHeight;
      const ctx = resizedCanvas.getContext('2d');

      if (ctx) {
        // Draw the original high-res canvas into the resized canvas
        // This also acts as a flattening step to ensure 24-bit RGB (no alpha)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
      }

      // Export as JPEG. JPEG naturally drops the alpha channel resulting in a 24-bit image (RGB, 8 bits per channel).
      const dataUrl = resizedCanvas.toDataURL('image/jpeg', 0.95);
      setGeneratedImageUrl(dataUrl);
    } catch (error) {
      console.error('画像生成に失敗しました:', error);
      alert('画像の生成に失敗しました。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImageUrl) return;

    const link = document.createElement('a');
    link.href = generatedImageUrl;
    // Download as .jpg since we changed format to image/jpeg for 24-bit color depth
    link.download = `nice-book-${new Date().getTime()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackToEdit = () => {
    setGeneratedImageUrl(null);
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="title">言葉を、本にする。</h1>
        <p className="subtitle">
          あなたの好きなフレーズを、まるでベストセラービジネス書の見開きページのように。
          SNSでシェアしたくなる、リアルでプレミアムな画像を生成します。
        </p>
      </header>

      <main className="glass-panel">
        {!generatedImageUrl ? (
          <>
            <div className="input-section">
              <label htmlFor="book-text" className="input-label">
                本に刻みたい言葉を入力
              </label>
              <textarea
                id="book-text"
                className="text-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="例：&#13;&#10;成功の秘訣は、&#13;&#10;ただやり続けることだ。"
                rows={4}
              />
            </div>

            <div className="preview-section">
              <h2 className="preview-title">プレビュー</h2>
              <BookPreview ref={previewRef} text={inputText} />

              <div className="button-group">
                <button
                  className="btn btn-primary"
                  onClick={handleGenerate}
                  disabled={isGenerating || !inputText.trim()}
                >
                  {isGenerating ? (
                    <>
                      <span className="spinner"></span>
                      生成中...
                    </>
                  ) : (
                    '画像を生成する'
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="preview-section">
            <h2 className="preview-title">完成しました！</h2>
            <div style={{ marginBottom: '2rem', width: '100%', maxWidth: '800px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              <img
                src={generatedImageUrl}
                alt="Generated Book"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>

            <div className="button-group">
              <button className="btn btn-secondary" onClick={handleBackToEdit}>
                戻る
              </button>
              <button className="btn btn-primary" onClick={handleDownload}>
                ⏬ 画像をダウンロード
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
