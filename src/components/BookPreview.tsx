import { useState, useEffect, useRef, forwardRef } from 'react';
import * as THREE from 'three';
import * as htmlToImage from 'html-to-image';
import bookBackgroundImage from '../assets/realistic_left_page_book.png';
import { ThreeBookPage } from './ThreeBookPage';

interface BookPreviewProps {
  text: string;
  onReady?: () => void;
  generateTrigger?: number;
}

export const BookPreview = forwardRef<HTMLDivElement, BookPreviewProps>(
  ({ text, onReady, generateTrigger }, ref) => {
    // Split the text into lines, handling empty strings
    const lines = text.split('\n'); // keep empty lines for formatting!

    const maxLines = lines.length;
    const maxCharsPerLine = Math.max(...lines.map(line => line.length), 0);

    // ==========================================
    // [設定パラメータ] デザインの微調整用変数
    // ==========================================
    const MIN_FONT_SIZE_REM = 2;        // フォントサイズの「最小値」(rem)
    const MAX_FONT_SIZE_REM = 4.5;        // フォントサイズの「最大値」(rem)
    const BASE_CHAR_COUNT_FOR_SCALE = 24; // この文字数基準を超えるとフォントが縮小され始めます

    // 縦1行に入れる「最大文字数（折り返し限界）」
    // null の場合はコンテナサイズから自動計算されます。
    // 固定したい場合は数値を指定してください（例: 22）
    const MANUAL_MAX_CHARS_PER_LINE: number | null = null;

    // --- 扇状パース（行スライド）の強さ ---
    const CENTER_LINE_ANGLE_DEG = 1.6;    // 左右中心行の基本の傾き角度（度）
    const FAN_ANGLE_DEG_PER_LINE = 1.4;   // 中心から1行離れるごとの傾き変化量（度）
    const FAN_Y_SHIFT_EM_PER_LINE = 0.5;  // 1行ごとの上方向への段差（旧: 0.5）
    const FAN_X_SHIFT_EM_PER_LINE = 0.15; // 1行ごとの左方向へのズレ（旧: 0.15）

    // --- 描画コンテナのサイズ＆余白設定 ---
    const CONTAINER_WIDTH_PX = 980;         // コンテナの幅 (px)
    const CONTAINER_HEIGHT_PX = 1680;        // コンテナの高さ (px) (旧: 1480px から下端拡大のため拡張)
    const CONTAINER_PADDING_TOP_REM = 6;     // 上部余白 (rem) ※1rem=16px換算で80px
    const CONTAINER_PADDING_BOTTOM_REM = 0;  // 下部余白 (rem)
    // ==========================================

    let fontSize = MAX_FONT_SIZE_REM; // 初期値として最大値をセット

    // Calculate font size to fit container
    if (maxLines > 0 || maxCharsPerLine > 0) {
      const scaleForChars = BASE_CHAR_COUNT_FOR_SCALE / Math.max(8, maxCharsPerLine);
      const scaleForLines = 6 / Math.max(3, maxLines);
      const scaleFactors = Math.min(1.0, scaleForChars, scaleForLines);
      fontSize = Math.max(MIN_FONT_SIZE_REM, MAX_FONT_SIZE_REM * scaleFactors);
    }

    // --- Calculate visual columns to apply staircase effect to wrapped lines ---
    // The container height is exactly parameterized.
    // Padding top and bottom are also parameterized.
    const paddingTotalPx = (CONTAINER_PADDING_TOP_REM + CONTAINER_PADDING_BOTTOM_REM) * 16;
    const availableHeightPx = CONTAINER_HEIGHT_PX - paddingTotalPx;
    // Container font size calculation logic
    const fontSizePx = fontSize * 1.2 * 16;
    // letter-spacing is 0.12em. Therefore, 1 character height is approx 1.12 * fontSizePx
    const charHeightPx = fontSizePx * 1.12;

    // We reserve at least 1 character. Also let's subtract 0.5 char height for safety against native wrapping
    const autoMaxChars = Math.max(1, Math.floor((availableHeightPx - charHeightPx * 0.5) / charHeightPx));

    // ユーザー設定の最大文字数があればそれを優先し、なければ自動計算を使用
    const maxCharsPerColumn = MANUAL_MAX_CHARS_PER_LINE !== null ? MANUAL_MAX_CHARS_PER_LINE : autoMaxChars;

    const visualColumns: string[] = [];
    // Basic Kinsoku Shori (characters that should not start a new line)
    const kinsokuStart = ['。', '、', '」', '）', 'ー', '！', '？', '…', '』', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'っ', 'ゃ', 'ゅ', 'ょ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ッ', 'ャ', 'ュ', 'ョ'];

    lines.forEach(logicalLine => {
      if (!logicalLine) {
        visualColumns.push('');
        return;
      }

      let remaining = logicalLine;
      while (remaining.length > 0) {
        if (remaining.length <= maxCharsPerColumn) {
          visualColumns.push(remaining);
          break;
        }

        let breakIndex = maxCharsPerColumn;

        // Prevent Kinsoku characters from ending up at the start of the next line
        if (breakIndex < remaining.length && kinsokuStart.includes(remaining[breakIndex])) {
          breakIndex -= 1;
          while (breakIndex > 1 && kinsokuStart.includes(remaining[breakIndex])) {
            breakIndex -= 1;
          }
        }

        visualColumns.push(remaining.substring(0, breakIndex));
        remaining = remaining.substring(breakIndex);
      }
    });

    const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
    const hiddenContainerRef = useRef<HTMLDivElement>(null);

    const onReadyRef = useRef(onReady);
    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    // Texture generation (triggered by text or trigger changes, no typing debounce)
    useEffect(() => {
      // Don't auto-generate on initial empty text unless triggered
      if (!text && !generateTrigger) return;

      let isMounted = true;
      const generateTexture = async () => {
        if (hiddenContainerRef.current) {
          try {
            // Give browser a frame to render the DOM size correctly
            await new Promise(resolve => requestAnimationFrame(resolve));

            // Use html-to-image to correctly render vertical writing mode (writing-mode: vertical-rl) and OpenType features like 'vert' for Japanese typography
            const canvas = await htmlToImage.toCanvas(hiddenContainerRef.current, {
              backgroundColor: 'rgba(0,0,0,0)', // Ensure transparent background
              pixelRatio: 2, // High resolution texture
            });

            const newTexture = new THREE.CanvasTexture(canvas);
            newTexture.minFilter = THREE.LinearFilter;
            newTexture.magFilter = THREE.LinearFilter;
            newTexture.format = THREE.RGBAFormat;

            if (isMounted) {
              setTexture(newTexture);
              // Wait for Three.js to render the new texture
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  if (onReadyRef.current) onReadyRef.current();
                });
              });
            }
          } catch (e) {
            console.error('Failed to generate texture:', e);
            if (isMounted && onReadyRef.current) onReadyRef.current();
          }
        }
      };

      generateTexture();
      return () => { isMounted = false; };
    }, [text, fontSize, generateTrigger]);

    return (
      <div className="book-container-wrapper">
        <div
          className="book-capture-area left-page-only"
          ref={ref}
        >
          {/* Background image of the zoomed-in left page */}
          <img
            src={bookBackgroundImage}
            alt="Blank left page"
            className="book-background"
            crossOrigin="anonymous"
          />

          {/* Overlay for the 3D Three.js canvas */}
          <div className="book-text-overlay left-page-overlay">
            <ThreeBookPage texture={texture} />
          </div>

          {/* 
            HIDDEN DOM FOR TEXTURE GENERATION 
            It perfectly mimics the text layout, but is invisible and unclickable.
            It is centered as a block so the texture maps directly onto the plane.
          */}
          <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none', opacity: 0 }}>
            <div
              ref={hiddenContainerRef}
              style={{
                width: `${CONTAINER_WIDTH_PX}px`,
                height: `${CONTAINER_HEIGHT_PX}px`,
                display: 'flex',
                justifyContent: 'center', // horizontally center
                alignItems: 'flex-start', // Top-align text to start at the top margin and fill downwards, reducing bottom empty space
                backgroundColor: 'transparent',
                // 定数化したパディングを適用
                padding: `${CONTAINER_PADDING_TOP_REM}rem 4rem ${CONTAINER_PADDING_BOTTOM_REM}rem 4rem`
              }}
            >
              <div
                className="book-text-content"
                style={{
                  fontSize: `${fontSize * 1.2}rem`, // Scale moderately for the large hidden container
                  lineHeight: 1.6,
                }}
              >
                {visualColumns.length > 0 ? (() => {
                  const centerIndex = (visualColumns.length - 1) / 2;
                  return visualColumns.map((col, index) => {
                    // 中心行からどれだけ離れているか（右ならマイナス、左ならプラス）
                    const relativeIndex = index - centerIndex;
                    // 中心行を基準として、右側（relativeが負）なら角度をマイナス方向へ、左側（relativeが正）ならプラス方向に増やす
                    const rotateAngle = CENTER_LINE_ANGLE_DEG + (relativeIndex * FAN_ANGLE_DEG_PER_LINE);

                    return (
                      <div
                        key={index}
                        style={{
                          marginRight: index < visualColumns.length - 1 ? '0.8em' : '0',
                          minHeight: '1em', // Ensure empty lines (newlines) take vertical space
                          // 階段状に上へシフト (translateY) はそのまま
                          // 中心行を基準とした放射状（扇状）に広がるように回転 (rotateZ) を適用
                          transformOrigin: 'top center',
                          transform: `translateY(-${index * FAN_Y_SHIFT_EM_PER_LINE}em) translateX(${index * FAN_X_SHIFT_EM_PER_LINE}em) rotateZ(${rotateAngle}deg)`,
                        }}
                      >
                        {col}
                      </div>
                    );
                  });
                })() : (
                  <div style={{ opacity: 0.2 }}>ここに表示</div>
                )}
              </div>
            </div>
          </div>

          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '14px',
            fontFamily: 'sans-serif',
            letterSpacing: '0.05em',
            pointerEvents: 'none',
            zIndex: 10,
            textShadow: '0px 1px 3px rgba(0,0,0,0.8)'
          }}>
            https://nice-book.forestailjp.workers.dev/
          </div>

        </div>
      </div>
    );
  }
);

BookPreview.displayName = 'BookPreview';
