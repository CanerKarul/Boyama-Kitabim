import React, { useState } from 'react';
import { ColoringPage } from '../types';

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
}

const uiStrings = {
  tr: {
    step: "ADIM 3/3 - ÖNİZLEME",
    title: "Harika! İşte Boyama Kitabın",
    subtitle: "Sayfaları incele, üzerinde değişiklik yap veya hazır olduğunda kitabını indir.",
    newBook: "Yeni Kitap Oluştur",
    regenerate: "Yeniden Oluştur",
    download: "PDF'i İndir",
    downloading: "İndiriliyor...",
    colorPaletteLabel: "Önerilen Renkler:",
  },
  en: {
    step: "STEP 3/3 - PREVIEW",
    title: "Awesome! Here's Your Coloring Book",
    subtitle: "Review the pages, make changes, or download your book when you're ready.",
    newBook: "Create New Book",
    regenerate: "Regenerate",
    download: "Download PDF",
    downloading: "Downloading...",
    colorPaletteLabel: "Suggested Colors:",
  }
};


const PreviewScreen: React.FC<PreviewScreenProps> = ({ name, theme, pages, onEdit, onRegenerate, language }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const s = uiStrings[language as keyof typeof uiStrings] || uiStrings.tr;

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const A4_WIDTH = 210;
    const A4_HEIGHT = 297;
    const MARGIN = 10;
    const MAX_WIDTH = A4_WIDTH - MARGIN * 2;
    const MAX_HEIGHT = A4_HEIGHT - MARGIN * 2 - 25; // Extra space for palette/page number
    
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
                doc.addImage(page.imageUrl, 'PNG', 0, 0, A4_WIDTH, A4_HEIGHT);
            } else { // Coloring pages
                doc.addImage(img, 'PNG', x, y, imgWidth, imgHeight);
            }

        } catch (error) {
            console.error(`Failed to add image ${i} to PDF:`, error);
            doc.text(`Image for "${page.title}" failed to load.`, A4_WIDTH / 2, A4_HEIGHT / 2, { align: 'center' });
        }

        if (i > 0) {
            // Add suggested color palette
            if (page.colorPalette && page.colorPalette.length > 0) {
                const palette = page.colorPalette;
                const swatchSize = 8;
                const swatchSpacing = 12; // Increased spacing for better readability
                const totalPaletteWidth = (palette.length * (swatchSize + swatchSpacing)) - swatchSpacing;
                const startX = (A4_WIDTH - totalPaletteWidth) / 2;
                const startY = A4_HEIGHT - 25;

                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.setFont('helvetica', 'normal');
                const labelText = s.colorPaletteLabel;
                const labelWidth = doc.getTextWidth(labelText);
                doc.text(labelText, startX - labelWidth - 5 > 0 ? startX - labelWidth - 5 : 10, startY + swatchSize / 2 + 1);

                palette.forEach((color, index) => {
                    const itemWidth = swatchSize + swatchSpacing;
                    const swatchX = startX + index * itemWidth;
                    doc.setFillColor(color.hex);
                    doc.rect(swatchX, startY, swatchSize, swatchSize, 'F');

                    doc.setFontSize(8);
                    doc.setTextColor(50, 50, 50);
                    // Use maxWidth to prevent text from overlapping
                    doc.text(color.name, swatchX + swatchSize / 2, startY + swatchSize + 5, { align: 'center', maxWidth: itemWidth - 2 });
                });
            }

            // Add page number
            const pageNumText = `${i} / ${pages.length - 1}`;
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'normal');
            doc.text(pageNumText, A4_WIDTH / 2, A4_HEIGHT - 7, { align: 'center' });
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
            <div className="flex overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-start gap-4 p-1 md:gap-6">
                {/* Cover Page */}
                {coverPage && (
                  <div className="group/page flex h-full min-w-[15rem] flex-1 flex-col gap-3 md:min-w-[18rem]">
                    <div className="relative w-full aspect-[3/4] overflow-hidden rounded-xl border-4 border-accent shadow-lg">
                      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-300 ease-in-out group-hover/page:scale-110" style={{ backgroundImage: `url("${coverPage.imageUrl}")` }}></div>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 p-4 transition-opacity duration-300 ease-in-out group-hover/page:opacity-0">
                        <h2 className="text-center font-display text-3xl font-bold text-white">{coverPage.description}</h2>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-display text-lg font-bold leading-normal text-text-light dark:text-text-dark">{coverPage.title}</p>
                        <p className="font-body text-sm font-normal leading-normal text-slate-500 dark:text-slate-400 truncate">{coverPage.description}</p>
                      </div>
                    </div>
                  </div>
                )}
                {/* Coloring Pages */}
                {coloringPages.map((page, index) => (
                  <div key={index} className="group/page flex h-full min-w-[15rem] flex-1 flex-col gap-3 md:min-w-[18rem]">
                    <div className="relative w-full overflow-hidden rounded-xl border-2 border-gray-200 bg-white dark:border-gray-700 shadow-lg">
                      <div className="w-full bg-center bg-no-repeat aspect-[3/4] bg-contain transition-transform duration-300 ease-in-out group-hover/page:scale-110" style={{ backgroundImage: `url("${page.imageUrl}")` }}></div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-display text-lg font-bold leading-normal text-text-light dark:text-text-dark">{page.title}</p>
                        <p className="font-body text-sm font-normal leading-normal text-slate-500 dark:text-slate-400 truncate">{page.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center pt-4 md:pt-8">
                <div className="flex w-full max-w-lg flex-col gap-3 sm:flex-row">
                    <button onClick={onEdit} aria-label="Yeni kitap oluştur" className="flex h-14 w-full sm:flex-1 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-slate-200/80 text-text-light dark:bg-slate-800/80 dark:text-text-dark px-6 font-display text-base font-bold leading-normal tracking-wide transition-all duration-300 hover:bg-slate-300/80 dark:hover:bg-slate-700/80 hover:scale-105">
                        <span className="material-symbols-outlined">edit</span>
                        <span>{s.newBook}</span>
                    </button>
                     <button onClick={onRegenerate} aria-label="Mevcut ayarlar ile yeniden oluştur" className="flex h-14 w-full sm:flex-1 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-blue-200/80 text-text-light dark:bg-blue-800/80 dark:text-text-dark px-6 font-display text-base font-bold leading-normal tracking-wide transition-all duration-300 hover:bg-blue-300/80 dark:hover:bg-blue-700/80 hover:scale-105">
                        <span className="material-symbols-outlined">refresh</span>
                        <span>{s.regenerate}</span>
                    </button>
                    <button onClick={handleDownloadPdf} disabled={isDownloading} aria-label="Boyama kitabını PDF olarak indir" className="flex h-14 w-full sm:flex-1 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-accent text-white px-6 font-display text-base font-bold leading-normal tracking-wide shadow-lg shadow-accent/40 transition-transform duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-wait">
                        {isDownloading ? (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
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