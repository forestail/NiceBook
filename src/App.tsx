import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { BookPreview } from './components/BookPreview';
import './index.css';

function App() {
  const [inputText, setInputText] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [generateTrigger, setGenerateTrigger] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isDebugMode] = useState(false); // デバッグ用プレビュー表示フラグ
  const previewRef = useRef<HTMLDivElement>(null);
  const isGeneratingRef = useRef(false);

  const handleGenerate = () => {
    if (!inputText.trim()) {
      alert('テキストを入力してください');
      return;
    }

    if (!previewRef.current) return;

    isGeneratingRef.current = true;
    setIsGenerating(true);
    setPreviewText(inputText);
    setGenerateTrigger(prev => prev + 1);
  };

  const handlePreviewReady = async () => {
    if (!isGeneratingRef.current) return;

    try {
      if (!previewRef.current) return;

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
      isGeneratingRef.current = false;
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

  const handleShareX = () => {
    // 実際には画像のURLをサーバーにアップロードして発行されたURLを使用する必要があります。
    // 現状はアプリ自体のURL（例）とハッシュタグをシェアとします。
    const shareUrl = encodeURIComponent('https://nice-book.forestailjp.workers.dev/');
    const shareText = encodeURIComponent('言葉を本にする「Nice-Book Generator」\n#NiceBook\n');
    window.open(`https://x.com/intent/tweet?url=${shareUrl}&text=${shareText}`, '_blank');
  };

  const handleShareFacebook = () => {
    const shareUrl = encodeURIComponent('https://nice-book.forestailjp.workers.dev/');
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank');
  };

  const handleShareLine = () => {
    const shareUrl = encodeURIComponent('https://nice-book.forestailjp.workers.dev/');
    const shareText = encodeURIComponent('言葉を本にする「Nice-Book Generator」\n');
    // LINEのシェアURLスキーム
    window.open(`https://social-plugins.line.me/lineit/share?url=${shareUrl}&text=${shareText}`, '_blank');
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="title">言葉を本にする</h1>
        <p className="subtitle">
          あなたの好きなフレーズを、本のページのように表示します。
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

            <div className="button-group" style={{ marginBottom: '2rem' }}>
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
                  '本を開く'
                )}
              </button>
            </div>

            {/* BookPreviewは通常時は裏でレンダリングしておき、画像化の対象にする */}
            <div style={isDebugMode ? { marginBottom: '2rem' } : { position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
              {isDebugMode && <h2 className="preview-title" style={{ fontSize: '1rem', color: '#888' }}>デバッグプレビュー</h2>}
              <BookPreview ref={previewRef} text={previewText} generateTrigger={generateTrigger} onReady={handlePreviewReady} />
            </div>

            {/* デバッグモードのトグルスイッチ */}
            {/* <div style={{ textAlign: 'center', marginTop: 'auto', paddingTop: '2rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isDebugMode}
                  onChange={(e) => setIsDebugMode(e.target.checked)}
                  style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                />
                プレビューを表示 (デバッグ用)
              </label>
            </div> */}
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

            <div className="share-section" style={{ marginTop: '2rem', textAlign: 'center' }}>
              <p style={{ marginBottom: '1rem', color: '#ccc', fontSize: '0.9rem' }}>本サービスをSNSでシェアする</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button
                  onClick={handleShareX}
                  style={{ backgroundColor: '#000', color: '#fff', padding: '0.5rem 1.5rem', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  X (Twitter)
                </button>
                <button
                  onClick={handleShareFacebook}
                  style={{ backgroundColor: '#1877F2', color: '#fff', padding: '0.5rem 1.5rem', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Facebook
                </button>
                <button
                  onClick={handleShareLine}
                  style={{ backgroundColor: '#06C755', color: '#fff', padding: '0.5rem 1.5rem', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  LINE
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
