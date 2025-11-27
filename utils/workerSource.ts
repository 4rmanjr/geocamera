
// This file contains the raw code for the Web Worker.
// It is kept separate to keep the main logic files clean.

export const WORKER_CODE = `
  self.onmessage = async (e) => {
    const { 
      sourceBitmap, 
      logoBitmap, 
      qrBitmap, 
      config 
    } = e.data;

    try {
      // --- 1. DETERMINE ORIENTATION & RAW DIMENSIONS ---
      const isRawLandscape = sourceBitmap.width > sourceBitmap.height;
      
      let effWidth, effHeight;
      if (isRawLandscape) {
         effWidth = sourceBitmap.height;
         effHeight = sourceBitmap.width;
      } else {
         effWidth = sourceBitmap.width;
         effHeight = sourceBitmap.height;
      }

      // --- 2. CALCULATE CROP (Consistent Aspect Ratio) ---
      let cropX = 0, cropY = 0, cropW = effWidth, cropH = effHeight;
      const isPortrait = effHeight > effWidth;
      let targetRatio = 0;

      if (config.aspectRatio === '16:9') {
          targetRatio = isPortrait ? (9/16) : (16/9);
      } else if (config.aspectRatio === '4:3') {
          targetRatio = isPortrait ? (3/4) : (4/3);
      }

      if (targetRatio > 0) {
          const currentRatio = effWidth / effHeight;
          if (Math.abs(currentRatio - targetRatio) > 0.005) {
              if (currentRatio > targetRatio) {
                  cropW = effHeight * targetRatio;
                  cropX = (effWidth - cropW) / 2;
              } else {
                  cropH = effWidth / targetRatio;
                  cropY = (effHeight - cropH) / 2;
              }
          }
      }

      let finalWidth = Math.floor(cropW);
      let finalHeight = Math.floor(cropH);

      // --- 3. HANDLE RESOLUTION SCALING ---
      // Updated Resolution Logic for Higher Quality
      let scale = 1;
      const maxDim = Math.max(finalWidth, finalHeight);

      if (config.resolution === 'medium') {
          // Bump "Medium" to Full HD (1920px) - was 1280px
          const MAX_SIDE_MED = 1920; 
          if (maxDim > MAX_SIDE_MED) {
              scale = MAX_SIDE_MED / maxDim;
          }
      } else {
          // For "High", cap at 4K (4096px) to ensure Canvas stability on mobile
          // while preserving maximum details from modern sensors.
          const MAX_SIDE_HIGH = 4096;
          if (maxDim > MAX_SIDE_HIGH) {
              scale = MAX_SIDE_HIGH / maxDim;
          }
      }
      
      finalWidth = Math.floor(finalWidth * scale);
      finalHeight = Math.floor(finalHeight * scale);

      // --- 4. CREATE CANVAS & DRAW ---
      const canvas = new OffscreenCanvas(finalWidth, finalHeight);
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Failed to create worker context');

      context.save();
      context.scale(scale, scale);
      context.translate(-cropX, -cropY);

      if (isRawLandscape) {
        context.translate(effWidth / 2, effHeight / 2);
        context.rotate(-90 * Math.PI / 180);
        
        if (config.isFrontCamera) {
             context.scale(1, -1); 
        }
        context.drawImage(sourceBitmap, -sourceBitmap.width / 2, -sourceBitmap.height / 2);
      } else {
        if (config.isFrontCamera) {
           context.translate(effWidth, 0);
           context.scale(-1, 1);
        }
        context.drawImage(sourceBitmap, 0, 0);
      }
      context.restore();

      // --- 5. DRAW WATERMARKS ---
      const width = finalWidth;
      const height = finalHeight;
      const padding = width * 0.04;
      const baseFontSize = width * 0.035 * (config.overlayScaleFactor || 1.0);
      const smallFontSize = baseFontSize * 0.75;
      
      const cursors = {
        'top-left': padding,
        'top-right': padding,
        'bottom-left': height - padding,
        'bottom-right': height - padding,
      };

      const updateCursor = (pos, amount) => {
        if (pos.startsWith('top')) cursors[pos] += amount;
        else cursors[pos] -= amount;
      };

      const getX = (pos) => pos.includes('left') ? padding : width - padding;
      const getY = (pos) => cursors[pos];
      const getTextAlign = (pos) => pos.includes('left') ? 'left' : 'right';

      // --- Use passed scale config directly ---
      const getTargetSize = (sizeKey) => {
         const percentage = config.scaleConfig[sizeKey] || 0.15; // default to medium/15%
         return width * percentage;
      };

      context.fillStyle = 'white';
      context.shadowColor = 'black';
      context.shadowBlur = 6;
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;

      const drawTextLine = (text, pos, fontSize, bold = false, monospace = false) => {
        context.font = (bold ? 'bold ' : '') + fontSize + 'px ' + (monospace ? 'monospace' : 'sans-serif');
        context.textAlign = getTextAlign(pos);
        context.textBaseline = pos.startsWith('top') ? 'top' : 'bottom';
        context.fillText(text, getX(pos), getY(pos));
        updateCursor(pos, fontSize * 1.5);
      };

      const drawFunctions = {
        'logo': () => {
            if (logoBitmap && config.showLogo) {
                const logoTargetWidth = getTargetSize(config.logoSize);
                const scale = logoTargetWidth / logoBitmap.width;
                const logoTargetHeight = logoBitmap.height * scale;
                const pos = config.posLogo;
                let drawY = getY(pos);
                if (pos.startsWith('bottom')) drawY -= logoTargetHeight;
                let drawX = getX(pos);
                if (pos.includes('right')) drawX -= logoTargetWidth;

                context.shadowBlur = 0; context.shadowOffsetX = 0; context.shadowOffsetY = 0;
                context.drawImage(logoBitmap, drawX, drawY, logoTargetWidth, logoTargetHeight);
                context.shadowBlur = 6; context.shadowOffsetX = 2; context.shadowOffsetY = 2;
                updateCursor(pos, logoTargetHeight + (padding / 2));
            }
        },
        'qr': () => {
            if (qrBitmap && config.showQrCode) {
                const qrSize = getTargetSize(config.qrSize);
                const pos = config.posQr;
                let drawY = getY(pos);
                if (pos.startsWith('bottom')) drawY -= qrSize;
                let drawX = getX(pos);
                if (pos.includes('right')) drawX -= qrSize;

                context.shadowBlur = 0; context.shadowOffsetX = 0; context.shadowOffsetY = 0;
                context.drawImage(qrBitmap, drawX, drawY, qrSize, qrSize);
                context.shadowBlur = 6; context.shadowOffsetX = 2; context.shadowOffsetY = 2;
                updateCursor(pos, qrSize + (padding / 2));
            }
        },
        'company': () => {
            if (config.showCompany) drawTextLine(config.companyName.toUpperCase(), config.posCompany, baseFontSize, true);
        },
        'project': () => {
            if (config.showProject) drawTextLine(config.projectName, config.posProject, baseFontSize, true);
        },
        'time': () => {
            if (config.showTime) drawTextLine(config.timeString, config.posTime, smallFontSize, true);
        },
        'coordinates': () => {
            if (config.showCoordinates) {
                const isBottom = config.posCoordinates.startsWith('bottom');
                const addressFontSize = smallFontSize * 0.9;

                const drawGeo = () => drawTextLine(config.geoString, config.posCoordinates, smallFontSize, false, true);
                
                const drawAddress = () => {
                     if (config.addressLines && config.addressLines.length > 0) {
                        // For bottom, we draw the last line first (lowest), then move up.
                        // Visual Goal:
                        // Lat/Long
                        // Address Line 1
                        // Address Line 2
                        
                        // If Bottom:
                        // Draw Address Line 2 (at bottom) -> cursor moves up
                        // Draw Address Line 1 (above 2) -> cursor moves up
                        // Draw Lat/Long (above 1) -> cursor moves up
                        
                        const linesToDraw = isBottom ? [...config.addressLines].reverse() : config.addressLines;
                        linesToDraw.forEach(line => {
                            drawTextLine(line, config.posCoordinates, addressFontSize, false, false);
                        });
                     }
                };

                if (isBottom) {
                    drawAddress();
                    drawGeo();
                } else {
                    drawGeo();
                    drawAddress();
                }
            }
        }
      };

      if (config.itemOrder && Array.isArray(config.itemOrder)) {
        config.itemOrder.forEach(itemType => {
            if (drawFunctions[itemType]) drawFunctions[itemType]();
        });
      }

      // Increased output JPEG quality to 0.95 (High Quality)
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.95 });
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        self.postMessage({ success: true, data: reader.result });
      };

    } catch (e) {
      self.postMessage({ success: false, error: e.message });
    }
  };
`;
