import React, { useState } from 'react';
import { ColoringPage } from '../types';
import { GoogleGenAI, Modality } from '@google/genai';

declare global {
    interface Window {
        jspdf: any;
    }
}

interface PreviewScreenProps {
  name: string;
  theme: string;
  pages: ColoringPage[];
  onEdit: () => void;
  onRegenerate: () => void;
  language: string;
  onLanguageChange: (lang: string) => void;
}

const uiStrings = {
  tr: {
    step: "ADIM 3/3 - ÖNİZLEME",
    title: "Harika! İşte Boyama Kitabın",
    subtitle: "Sayfaları incele, üzerinde değişiklik yap veya hazır olduğunda kitabını indir.",
    newBook: "Yeni Kitap",
    regenerate: "Tümünü Yeniden Üret",
    download: "PDF İndir",
    print: "Yazdır",
    downloading: "Hazırlanıyor...",
    colorPaletteLabel: "Önerilen Renkler:",
    coverTitle: "COCUKLARA OZEL BOYAMA KITABI", 
    coverSubtitle: (name: string) => `Senin Isteginle Sekilleniyor, ${name}!`,
    regeneratePage: "Bu Sayfayı Yenile"
  },
  en: {
    step: "STEP 3/3 - PREVIEW",
    title: "Awesome! Here's Your Coloring Book",
    subtitle: "Review the pages, make changes, or download your book when you're ready.",
    newBook: "New Book",
    regenerate: "Regenerate All",
    download: "Download PDF",
    print: "Print",
    downloading: "Preparing...",
    colorPaletteLabel: "Suggested Colors:",
    coverTitle: "SPECIAL FUN COLORING BOOK",
    coverSubtitle: (name: string) => `Shaped by Your Wishes, ${name}!`,
    regeneratePage: "Regenerate This Page"
  }
};

const transliterateTurkish = (text: string): string => {
    if (!text) return "";
    const replacements: { [key: string]: string } = {
        'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
        'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
    };
    return text.split('').map(char => replacements[char] || char).join('');
};

const LanguageSwitcher: React.FC<{ language: string; onLanguageChange: (lang: string) => void; }> = ({ language, onLanguageChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-200/80 dark:bg-slate-800/80 text-text-light dark:text-text-dark transition-colors hover:bg-slate-300/80 dark:hover:bg-slate-700/80">
                 <img src={`https://flagcdn.com/w20/${language === 'tr' ? 'tr' : 'gb'}.png`} alt={language} className="w-5 h-auto rounded-sm" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-32 origin-top-right rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <div className="py-1">
                        <button onClick={() => { onLanguageChange('tr'); setIsOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                             <img src="https://flagcdn.com/w20/tr.png" alt="Turkish" className="w-5 h-auto rounded-sm" />
                             <span>Türkçe</span>
                        </button>
                        <button onClick={() => { onLanguageChange('en'); setIsOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                           <img src="https://flagcdn.com/w20/gb.png" alt="English" className="w-5 h-auto rounded-sm" />
                           <span>English</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


const PreviewScreen: React.FC<PreviewScreenProps> = ({ name, theme, pages: initialPages, onEdit, onRegenerate, language, onLanguageChange }) => {
  const [pages, setPages] = useState<ColoringPage[]>(initialPages);
  const [isDownloading, setIsDownloading] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const s = uiStrings[language as keyof typeof uiStrings] || uiStrings.tr;

  const handleRegeneratePage = async (index: number) => {
      setRegeneratingIndex(index);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const page = pages[index];
          
          let prompt = `Create a coloring book page. Scene: ${page.title}. Style: Simple, thick outlines. Constraint: Pure black ink on white paper only. NO shading.`;
          let imageConfig = {};

          if (index === 0) {
              // Cover page logic - AI RENDERS TEXT
              const flagPrompt = language === 'tr' ? 'Include a waving Turkish flag in the background.' : '';
              
              const safeName = transliterateTurkish(name);
              const safeTitle = s.coverTitle; 
              const safeSubtitle = s.coverSubtitle(safeName);

              prompt = `Create a cover page illustration for a coloring book. 
              Theme: "${theme}". 
              Style: Vibrant, colorful, 3D digital art style. 
              Constraint: Full Color.
              Instructions:
              1. Render the text "${safeTitle}" boldly at the top of the image.
              2. Render the text "${safeSubtitle}" clearly at the bottom.
              3. Ensure spelling is exact.
              4. IMPORTANT: Keep all text away from the very edges of the image to prevent cutting. Center the composition.
              ${flagPrompt}`;
              
              imageConfig = { aspectRatio: '3:4' };
          }

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ text: prompt }] },
              config: { 
                  responseModalities: [Modality.IMAGE],
                  imageConfig: imageConfig
              },
          });

          let imageBase64 = '';
            if (response?.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        imageBase64 = part.inlineData.data;
                        break;
                    }
                }
            }
          
          if (imageBase64) {
              const newPages = [...pages];
              newPages[index] = {
                  ...page,
                  imageUrl: `data:image/png;base64,${imageBase64}`
              };
              setPages(newPages);
          }
      } catch (error) {
          console.error("Failed to regenerate page", error);
          alert("Could not regenerate this page. Please try again.");
      } finally {
          setRegeneratingIndex(null);
      }
  };

  const handlePrint = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${name} - Coloring Book</title>
            <style>
                @media print {
                    body { margin: 0; padding: 0; }
                    .page-break { page-break-after: always; }
                    .page-container { width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; }
                    img { max-width: 95%; max-height: 95%; object-fit: contain; }
                }
                body { font-family: sans-serif; text-align: center; }
                .page-container { margin-bottom: 20px; }
                img { max-width: 800px; border: 1px solid #ccc; }
            </style>
        </head>
        <body>
            <div class="page-container page-break">
                <img src="${pages[0].imageUrl}" />
            </div>
            ${pages.slice(1).map(page => `
                <div class="page-container page-break">
                    <img src="${page.imageUrl}" />
                </div>
            `).join('')}
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add font for better looking text (Standard fonts are limited, but Helvetica Bold is okay)
    doc.setFont("helvetica", "bold");

    const A4_WIDTH = 210;
    const A4_HEIGHT = 297;
    const MARGIN = 10;
    const MAX_WIDTH = A4_WIDTH - MARGIN * 2;
    const MAX_HEIGHT = A4_HEIGHT - MARGIN * 2 - 25; 
    
    const IMAGE_ASPECT_RATIO = 1 / 1; 

    let imgWidth = MAX_WIDTH;
    let imgHeight = MAX_WIDTH / IMAGE_ASPECT_RATIO;
    if (imgHeight > MAX_HEIGHT) {
        imgHeight = MAX_HEIGHT;
        imgWidth = imgHeight * IMAGE_ASPECT_RATIO;
    }
    const x = (A4_WIDTH - imgWidth) / 2;
    const y = MARGIN; 

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (i > 0) {
            doc.addPage();
        }

        try {
            const img = new Image();
            img.src = page.imageUrl;
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            if (i === 0) { // Cover page
                // Full Page "Aspect Fill" logic to prevent cutting off text while filling the page.
                const imgAspect = img.width / img.height;
                const pageAspect = A4_WIDTH / A4_HEIGHT;
                
                let renderW, renderH, renderX, renderY;

                // For the cover, we want to fill the page as much as possible, 
                // but since it has text, we prioritize NOT cropping width significantly if it's wider than A4.
                // However, "Complete Fill" was requested.
                // Best compromise: Fill the page. Since we are now generating 3:4 images (approx 0.75 ratio)
                // and A4 is 0.70 ratio, the image is slightly wider than the page.
                // We will match height (297) and crop the sides slightly (centering).
                
                // If Image is Wider than Page (3:4 image on A4)
                if (imgAspect > pageAspect) {
                    renderH = A4_HEIGHT;
                    renderW = renderH * imgAspect;
                    renderX = (A4_WIDTH - renderW) / 2; // Center horizontally (crops sides)
                    renderY = 0;
                } else {
                    // Image is Taller than Page (unlikely with 3:4, but possible with 9:16)
                    renderW = A4_WIDTH;
                    renderH = renderW / imgAspect;
                    renderY = (A4_HEIGHT - renderH) / 2; // Center vertically
                    renderX = 0;
                }
                
                doc.addImage(img, 'PNG', renderX, renderY, renderW, renderH);

            } else { // Coloring pages
                doc.addImage(img, 'PNG', x, y, imgWidth, imgHeight);
            }

        } catch (error) {
            console.error(`Failed to add image ${i} to PDF:`, error);
        }

        if (i > 0) {
            // Add suggested color palette WITH NAMES
            if (page.colorPalette && page.colorPalette.length > 0) {
                const palette = page.colorPalette;
                const swatchSize = 8;
                const itemGap = 12; // Increased gap for names
                const startY = A4_HEIGHT - 30; // Moved up slightly
                
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.setFont('helvetica', 'normal');
                
                const labelText = s.colorPaletteLabel;
                
                // Calculate total width of palette section to center it
                const totalPaletteWidth = (palette.length * swatchSize) + ((palette.length - 1) * itemGap);
                
                // Draw Label
                doc.text(labelText, A4_WIDTH / 2, startY - 5, { align: 'center' });

                let currentX = (A4_WIDTH - totalPaletteWidth) / 2;

                palette.forEach((color) => {
                    // Draw Swatch
                    doc.setFillColor(color.hex);
                    doc.setDrawColor(200, 200, 200); // Light grey border
                    doc.rect(currentX, startY, swatchSize, swatchSize, 'FD'); // Fill and Draw
                    
                    // Draw Name (Transliterated)
                    doc.setTextColor(50, 50, 50);
                    doc.setFontSize(7);
                    // Split name if too long
                    const cleanName = color.name;
                    doc.text(cleanName, currentX + (swatchSize/2), startY + swatchSize + 4, { align: 'center', maxWidth: swatchSize + 4 });
                    
                    currentX += swatchSize + itemGap;
                });
            }

            // Add page number
            const pageNumText = `${i} / ${pages.length - 1}`;
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'normal');
            doc.text(pageNumText, A4_WIDTH / 2, A4_HEIGHT - 5, { align: 'center' });
        }
    }
    
    doc.save(`${name.toLowerCase().replace(/ /g, '_')}_coloring_book.pdf`);
    setIsDownloading(false);
  };

  const coverPage = pages[0];
  const coloringPages = pages.slice(1);
  
  const toggleDarkMode = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };


  return (
    <>
      <header className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div></div>
          <div className="flex items-center gap-2">
            <button onClick={toggleDarkMode} aria-label="Yüksek kontrast modunu aç/kapat" className="h-10 w-10 inline-flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-xl">contrast</span>
            </button>
            <LanguageSwitcher language={language} onLanguageChange={onLanguageChange} />
          </div>
        </div>
      </header>
      <main className="flex-1 py-10 md:py-12">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 md:gap-12">
            <div className="flex flex-col gap-4 text-center">
              <div className="inline-flex items-center justify-center gap-2 font-display text-sm font-bold tracking-wider text-primary">
                <span className="material-symbols-outlined">check_circle</span>
                <span>{s.step}</span>
              </div>
              <div className="flex flex-col gap-2">
                <h1 className="font-display text-4xl font-black leading-tight tracking-tight text-text-light dark:text-text-dark md:text-5xl">{s.title}</h1>
                <p className="text-slate-500 dark:text-slate-400 mx-auto max-w-2xl text-base font-normal leading-normal md:text-lg">{s.subtitle}</p>
              </div>
            </div>
            
            {/* Scrollable Container */}
            <div className="flex overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-4 pb-12">
              <div className="flex items-start gap-4 px-4 md:gap-6">
                
                {/* Cover Page */}
                {coverPage && (
                  <div className="group/page relative flex h-full min-w-[15rem] flex-1 flex-col gap-3 md:min-w-[20rem]">
                     <button 
                        onClick={() => handleRegeneratePage(0)}
                        className="absolute z-30 top-4 right-4 h-10 w-10 rounded-full bg-white shadow-lg text-primary flex items-center justify-center opacity-0 group-hover/page:opacity-100 transition-opacity hover:scale-110"
                        title={s.regeneratePage}
                     >
                         {regeneratingIndex === 0 ? <span className="animate-spin material-symbols-outlined">refresh</span> : <span className="material-symbols-outlined">refresh</span>}
                     </button>

                    <div className="relative w-full aspect-[210/297] overflow-hidden rounded-xl border-4 border-slate-200 shadow-xl bg-white flex flex-col items-center justify-center">
                        <img 
                            src={coverPage.imageUrl} 
                            alt="Cover" 
                            className="w-full h-full object-cover" 
                        />
                    </div>
                  </div>
                )}

                {/* Coloring Pages */}
                {coloringPages.map((page, index) => {
                    const actualIndex = index + 1;
                    return (
                        <div key={index} className="group/page relative flex h-full min-w-[15rem] flex-1 flex-col gap-3 md:min-w-[18rem]">
                             <button 
                                onClick={() => handleRegeneratePage(actualIndex)}
                                className="absolute z-20 top-4 right-4 h-10 w-10 rounded-full bg-white shadow-lg text-primary flex items-center justify-center opacity-0 group-hover/page:opacity-100 transition-opacity hover:scale-110"
                                title={s.regeneratePage}
                            >
                                {regeneratingIndex === actualIndex ? <span className="animate-spin material-symbols-outlined">refresh</span> : <span className="material-symbols-outlined">refresh</span>}
                            </button>

                            <div className="relative w-full overflow-hidden rounded-xl border-2 border-gray-200 bg-white dark:border-gray-700 shadow-lg aspect-[210/297]">
                                <img src={page.imageUrl} alt={page.title} className="w-full h-full object-contain p-4" />
                            </div>
                            <div className="flex flex-col gap-2 px-1">
                                <div>
                                    <p className="font-display text-lg font-bold leading-normal text-text-light dark:text-text-dark truncate max-w-[14rem]">{page.title}</p>
                                    <p className="font-body text-sm font-normal leading-normal text-slate-500 dark:text-slate-400 truncate">{page.description}</p>
                                </div>
                                {/* Palette Preview */}
                                {page.colorPalette && (
                                    <div className="flex gap-2 flex-wrap">
                                        {page.colorPalette.map((c, i) => (
                                            <div key={i} className="flex flex-col items-center gap-1">
                                                <div className="w-6 h-6 rounded-full border border-slate-200" style={{ backgroundColor: c.hex }} title={c.name}></div>
                                                <span className="text-[10px] text-slate-500 max-w-[40px] truncate">{c.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
              </div>
            </div>

            <div className="flex justify-center pt-4 md:pt-8">
                <div className="grid grid-cols-2 md:grid-cols-4 w-full max-w-3xl gap-3">
                    <button onClick={onEdit} className="flex h-14 items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
                        <span className="material-symbols-outlined">edit</span>
                        <span className="hidden sm:inline">{s.newBook}</span>
                    </button>
                     <button onClick={onRegenerate} className="flex h-14 items-center justify-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all active:scale-95">
                        <span className="material-symbols-outlined">restart_alt</span>
                        <span className="hidden sm:inline">{s.regenerate}</span>
                    </button>
                    <button onClick={handlePrint} className="flex h-14 items-center justify-center gap-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 font-bold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all active:scale-95">
                        <span className="material-symbols-outlined">print</span>
                        <span>{s.print}</span>
                    </button>
                    <button onClick={handleDownloadPdf} disabled={isDownloading} className="flex h-14 items-center justify-center gap-2 rounded-xl bg-accent text-white font-bold shadow-lg shadow-accent/30 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isDownloading ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        ) : (
                            <span className="material-symbols-outlined">download</span>
                        )}
                        <span>{isDownloading ? s.downloading : s.download}</span>
                    </button>
                </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default PreviewScreen;