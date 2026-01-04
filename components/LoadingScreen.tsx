import React, { useEffect, useState, useRef } from 'react';
import { ColoringPage, ColorInfo } from '../types';
import { GoogleGenAI, Modality, Type } from '@google/genai';

interface LoadingScreenProps {
  name: string;
  pageCount: number;
  theme: string;
  age: number;
  canWrite: boolean;
  onComplete: (pages: ColoringPage[]) => void;
  language: string;
  specialTheme?: 'numbers' | 'letters' | null;
  specialThemeDetail?: string;
}

const uiStrings = {
  tr: {
    coverTitle: "COCUKLARA OZEL BOYAMA KITABI", // Transliterated for AI safety
    coverSubtitle: (name: string) => `Senin Isteginle Sekilleniyor, ${name}!`, // Transliterated
    writingPrompt: "Resimde ne görüyorsun? (Kısaca anlat)",
    coverPageTitle: "Kapak Sayfası",
    pageTitle: "Sayfa",
    generatingIdeas: "Yapay zeka hikayeyi kurguluyor...",
    generatingCharacter: "Ana karakter tasarlanıyor...",
    designingCover: "Kapak sayfası tasarlanıyor (Renkli)...",
    drawingPage: (idea: string) => `"${idea}" çiziliyor...`,
    pickingColors: (idea: string) => `"${idea}" için renkler seçiliyor...`,
    generatingTitle: (name: string, theme: string) => `${name} için ${theme} boyama kitabı hazırlanıyor...`,
    stepLabel: "Üretim",
    livePreview: "Canlı Önizleme",
    rateLimitError: "Boyama kitabı fabrikası şu anda çok meşgul! Lütfen birkaç dakika sonra tekrar deneyin.",
    internalError: "Yapay zeka modeli geçici bir sorun yaşadı. Lütfen kitabınızı yeniden oluşturmayı deneyin."
  },
  en: {
    coverTitle: "SPECIAL FUN COLORING BOOK",
    coverSubtitle: (name: string) => `Shaped by Your Wishes, ${name}!`,
    writingPrompt: "What do you see in the picture? (Tell a short story)",
    coverPageTitle: "Cover Page",
    pageTitle: "Page",
    generatingIdeas: "AI is crafting the story...",
    generatingCharacter: "Designing the main character...",
    designingCover: "Designing cover page (Colorful)...",
    drawingPage: (idea: string) => `Drawing "${idea}"...`,
    pickingColors: (idea: string) => `Picking colors for "${idea}"...`,
    generatingTitle: (name: string, theme: string) => `Creating a ${theme} coloring book for ${name}...`,
    stepLabel: "Generation",
    livePreview: "Live Preview",
    rateLimitError: "The coloring book factory is very busy right now! Please try again in a few moments.",
    internalError: "The AI model had a temporary problem. Please try regenerating your book."
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


const LoadingScreen: React.FC<LoadingScreenProps> = ({ name, pageCount, theme, age, canWrite, onComplete, language, specialTheme, specialThemeDetail }) => {
    const s = uiStrings[language as keyof typeof uiStrings] || uiStrings.tr;
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState(s.generatingIdeas);
    const [livePreviewImages, setLivePreviewImages] = useState<string[]>([]);
    
    // We add +1 for character design step in creative mode
    const [totalSteps, setTotalSteps] = useState(1 + 1 + 1 + (pageCount * 2)); 
    const [stepsCompleted, setStepsCompleted] = useState(0);
    
    // Use a ref to track if we've already started generation to prevent double-firing in StrictMode
    const hasStartedRef = useRef(false);

    useEffect(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // SPEED OPTIMIZATION: Use Flash for Logic to avoid stuck states.
        const logicModel = 'gemini-2.5-flash';
        const imageModel = 'gemini-2.5-flash-image';
        
        let localTotalSteps = 1 + 1 + 1 + (pageCount * 2); 
        if (specialTheme) {
            localTotalSteps = 1 + (pageCount * 2); // Simpler flow for educational
        }
        setTotalSteps(localTotalSteps);

        const updateProgress = (newStepsCompleted: number) => {
            setStepsCompleted(newStepsCompleted);
            setProgress(Math.min((newStepsCompleted / localTotalSteps) * 100, 100));
        };

        const addLivePreview = (base64Image: string) => {
            setLivePreviewImages(prev => [...prev, `data:image/png;base64,${base64Image}`]);
        };

        const generateImageWithRetry = async (
            model: string, 
            prompt: string, 
            config: any, 
            maxRetries = 3
        ): Promise<string> => {
            let lastError: Error | null = null;
            for (let i = 0; i < maxRetries; i++) {
                try {
                    // Backoff
                    if (i > 0) await new Promise(resolve => setTimeout(resolve, 2000));

                    const response = await ai.models.generateContent({
                        model,
                        contents: { parts: [{ text: prompt }] },
                        config,
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
                         return imageBase64; 
                    }
                    
                    lastError = new Error("Model response did not contain valid image data.");
        
                } catch (error) {
                    lastError = error as Error;
                    console.warn(`Attempt ${i + 1} failed for model ${model}.`, error);
                }
            }
            throw lastError || new Error(`Failed to generate image with model ${model}.`);
        };
        
        const generateEducationalPages = async () => {
             let currentSteps = 0;
             const generatedPages: ColoringPage[] = [];
             const langKey = language;
             const detectedLanguage = langKey === 'tr' ? 'Turkish' : 'English';
             
             setStatusText(s.designingCover);
             
             // COVER PROMPT: Colorful, with Flag if Turkish
             const flagPrompt = langKey === 'tr' ? 'Include a waving Turkish flag in the background.' : '';
             
             // Prepare text for AI (Transliterated)
             const safeName = transliterateTurkish(name);
             const safeTitle = s.coverTitle; 
             const safeSubtitle = s.coverSubtitle(safeName);

             const coverPrompt = `Create a cover page illustration for a children's book. 
             Theme: "${theme}". 
             Style: Vibrant, colorful, 3D Disney/Pixar style or detailed illustration.
             Constraint: Full Color.
             Instructions:
             1. Render the text "${safeTitle}" boldly at the top of the image.
             2. Render the text "${safeSubtitle}" clearly at the bottom.
             3. Ensure spelling is exact.
             4. IMPORTANT: Keep all text away from the very edges of the image to prevent cutting. Center the composition.
             ${flagPrompt}`;
             
             await new Promise(resolve => setTimeout(resolve, 500));
             
             const coverImageBase64 = await generateImageWithRetry(
                 imageModel,
                 coverPrompt,
                 { 
                     responseModalities: [Modality.IMAGE],
                     imageConfig: { aspectRatio: '3:4' } // Portrait aspect ratio for A4
                 }
             );
             
             addLivePreview(coverImageBase64);
             updateProgress(++currentSteps);
             generatedPages.push({
                 imageUrl: `data:image/png;base64,${coverImageBase64}`,
                 title: s.coverPageTitle,
                 description: `${name}'s ${theme} Adventure`,
             });
             
             let items: (string|number)[] = [];
             if (specialTheme === 'numbers' && specialThemeDetail) {
                 const [start, end] = specialThemeDetail.split('-').map(Number);
                 for(let i = start; i <= end; i++) items.push(i);
             } else if (specialTheme === 'letters' && specialThemeDetail) {
                 const [startChar, endChar] = specialThemeDetail.split('-');
                 if (langKey === 'tr') {
                     const turkishAlphabet = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ";
                     const startIndex = turkishAlphabet.indexOf(startChar);
                     const endIndex = turkishAlphabet.indexOf(endChar);
                     if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
                         for(let i = startIndex; i <= endIndex; i++) items.push(turkishAlphabet[i]);
                     } else {
                         for(let i = 65; i <= 90; i++) items.push(String.fromCharCode(i));
                     }
                 } else {
                     const startCode = startChar.charCodeAt(0);
                     const endCode = endChar.charCodeAt(0);
                     for(let i = startCode; i <= endCode; i++) items.push(String.fromCharCode(i));
                 }
             }
             
             const itemsPerPage = Math.ceil(items.length / pageCount);
             
             for (let i = 0; i < pageCount; i++) {
                 await new Promise(resolve => setTimeout(resolve, 500));

                 const pageItems = items.slice(i * itemsPerPage, (i + 1) * itemsPerPage);
                 if (pageItems.length === 0) continue;
                 
                 const idea = `${theme}: ${pageItems.join(', ')}`;
                 setStatusText(s.drawingPage(idea));
                 
                 const itemDescription = specialTheme === 'numbers' ? 'number(s)' : 'letter(s)';
                 const specificItems = pageItems.join(' and ');

                 const pagePrompt = `Create a simple coloring page of ${itemDescription}: ${specificItems}. Large, thick, hollow outlines. White background. NO shading. NO grayscale. Pure black lines.`;
                 
                 const pageImageBase64 = await generateImageWithRetry(
                     imageModel,
                     pagePrompt,
                     { responseModalities: [Modality.IMAGE] }
                 );
                 addLivePreview(pageImageBase64);
                 updateProgress(++currentSteps);
                 
                 setStatusText(s.pickingColors(idea));
                 const paletteResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: { parts: [{ inlineData: { mimeType: 'image/png', data: pageImageBase64 } }, { text: `Suggest 5 colors. JSON: { "colors": [{ "hex": "#...", "name": "..." }] }. Translate to ${detectedLanguage}.` }] },
                    config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { colors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { hex: { type: Type.STRING }, name: { type: Type.STRING } }, required: ['hex', 'name'] } } }, required: ['colors'] } }
                 });
                 updateProgress(++currentSteps);
                 const paletteText = paletteResponse.text.trim().replace(/^```json\s*/, '').replace(/```$/, '');
                 let pageColors: ColorInfo[] = [];
                 try {
                    pageColors = JSON.parse(paletteText).colors;
                    if (langKey === 'tr') { pageColors = pageColors.map(c => ({...c, name: transliterateTurkish(c.name)})); }
                 } catch (e) { console.error("Palette parse error", e); }

                 generatedPages.push({
                     imageUrl: `data:image/png;base64,${pageImageBase64}`,
                     title: idea,
                     description: `${s.pageTitle} ${i + 1}`,
                     colorPalette: pageColors,
                 });
             }
             
             return generatedPages;
        }

        const generateCreativePages = async () => {
            let currentSteps = 0;
            const generatedPages: ColoringPage[] = [];
            const langKey = language;
            const detectedLanguage = langKey === 'tr' ? 'Turkish' : 'English';

            // Step 1: Generate Ideas with Gemini 2.5 Flash (Faster)
            setStatusText(s.generatingIdeas);
            const ideasResponse = await ai.models.generateContent({
                model: logicModel,
                contents: `Generate a list of ${pageCount} simple, visual ideas for a coloring book. Theme: "${theme}". Audience: ${age}yo. Lang: ${detectedLanguage}. Return JSON key "ideas" with array of strings.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.OBJECT, properties: { ideas: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['ideas'] }
                }
            });
            updateProgress(++currentSteps);
            const responseText = ideasResponse.text.trim().replace(/^```json\s*/, '').replace(/```$/, '');
            const pageIdeas: string[] = JSON.parse(responseText).ideas;

            // Step 2: Character Profile (Fast)
            setStatusText(s.generatingCharacter);
            const characterResponse = await ai.models.generateContent({
                model: logicModel,
                contents: `Short visual description of main character for coloring book. Theme: "${theme}". Name: "${name}". Cute, simple line art style. Max 15 words.`,
            });
            updateProgress(++currentSteps);
            const characterProfile = characterResponse.text.trim();

            // Step 3: Cover Page
            setStatusText(s.designingCover);
            
            // COVER PROMPT: Colorful, with Flag if Turkish
            const flagPrompt = langKey === 'tr' ? 'Include a waving Turkish flag in the background.' : '';
            
            // Prepare text for AI (Transliterated)
            const safeName = transliterateTurkish(name);
            const safeTitle = s.coverTitle; 
            const safeSubtitle = s.coverSubtitle(safeName);

            const coverPrompt = `Create a cover page illustration. 
Theme: "${theme}". 
Character Reference: ${characterProfile}.
Style: High quality, vibrant, colorful, digital art style (Pixar-esque). 
Constraint: Full Color. 
Instructions:
1. Render the text "${safeTitle}" boldly at the top of the image.
2. Render the text "${safeSubtitle}" clearly at the bottom.
3. Ensure spelling is exact.
4. IMPORTANT: Keep all text away from the very edges of the image to prevent cutting. Center the composition.
${flagPrompt}`;
            
            await new Promise(resolve => setTimeout(resolve, 500));

            const coverImageBase64 = await generateImageWithRetry(
                imageModel, 
                coverPrompt, 
                { 
                    responseModalities: [Modality.IMAGE],
                    imageConfig: { aspectRatio: '3:4' } // Portrait for A4
                }
            );
            
            addLivePreview(coverImageBase64);
            updateProgress(++currentSteps);
            
            generatedPages.push({
                imageUrl: `data:image/png;base64,${coverImageBase64}`,
                title: s.coverPageTitle,
                description: `${name}'s ${theme} Adventure`,
            });

            // Step 4: Coloring Pages Loop
            for (let i = 0; i < pageCount; i++) {
                await new Promise(resolve => setTimeout(resolve, 500));

                const idea = pageIdeas[i % pageIdeas.length] || `${theme} ${i + 1}`;
                setStatusText(s.drawingPage(idea));
                
                const storyPrompt = canWrite 
                    ? `At the bottom of the page, include 3-4 simple, straight horizontal lines (like notebook paper) for the child to write a story. Do NOT add text labels like "Name" or "Date". Just blank lines.` 
                    : '';
                
                const pagePrompt = `Create a coloring book page.
Scene: ${idea}.
Character: ${characterProfile}.
Style: Simple, thick outlines.
Constraint: Pure black ink on white paper only. NO shading.
${storyPrompt}`;
                
                const pageImageBase64 = await generateImageWithRetry(imageModel, pagePrompt, {
                    responseModalities: [Modality.IMAGE]
                });
                
                addLivePreview(pageImageBase64);
                updateProgress(++currentSteps);

                setStatusText(s.pickingColors(idea));
                const paletteResponse = await ai.models.generateContent({
                    model: logicModel, 
                    contents: { parts: [{ inlineData: { mimeType: 'image/png', data: pageImageBase64 } }, { text: `Suggest 5 colors. JSON: { "colors": [{ "hex": "#...", "name": "..." }] }. Translate to ${detectedLanguage}.` }] },
                    config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { colors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { hex: { type: Type.STRING }, name: { type: Type.STRING } }, required: ['hex', 'name'] } } }, required: ['colors'] } }
                });
                updateProgress(++currentSteps);
                const paletteText = paletteResponse.text.trim().replace(/^```json\s*/, '').replace(/```$/, '');
                let pageColors: ColorInfo[] = [];
                try {
                     pageColors = JSON.parse(paletteText).colors;
                     // Transliterate Turkish characters for PDF safety
                     if (langKey === 'tr') { pageColors = pageColors.map(color => ({ ...color, name: transliterateTurkish(color.name) })); }
                } catch (e) { console.error("Palette parse error", e); }

                generatedPages.push({
                    imageUrl: `data:image/png;base64,${pageImageBase64}`,
                    title: `${idea}`,
                    description: `${s.pageTitle} ${i + 1}`,
                    colorPalette: pageColors,
                });
            }
            return generatedPages;
        };
        
        const runGeneration = async () => {
            try {
                let pages: ColoringPage[];
                if (specialTheme) {
                    pages = await generateEducationalPages();
                } else {
                    pages = await generateCreativePages();
                }
                onComplete(pages);
            } catch (error) {
                console.error("Error during page generation:", error);
                let errorMessage = "An error occurred. Please try again.";
                if (error instanceof Error) {
                     errorMessage = `Error: ${error.message}`;
                }
                alert(errorMessage);
                window.location.reload();
            }
        };

        runGeneration();
    }, [age, canWrite, language, name, onComplete, pageCount, specialTheme, specialThemeDetail, theme]);

    return (
        <div className="flex flex-1 flex-col items-center justify-center p-4 w-full max-w-5xl mx-auto">
            <header className="w-full flex justify-center mb-8">
                <div className="rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-sm px-6 py-2 border border-slate-200 dark:border-slate-700">
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        2/3 {s.stepLabel}
                    </p>
                </div>
            </header>

            <div className="w-full flex flex-col items-center gap-8">
                <div className="text-center space-y-2">
                    <h1 className="font-display text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                        {s.generatingTitle(name, theme)}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 animate-pulse font-medium">
                        {statusText}
                    </p>
                </div>

                <div className="w-full max-w-xl">
                    <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        <span>Start</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                </div>

                <div className="w-full mt-8">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{s.livePreview}</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {livePreviewImages.map((img, idx) => (
                            <div key={idx} className="aspect-[3/4] rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm animate-in fade-in zoom-in duration-500">
                                <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                            </div>
                        ))}
                        {livePreviewImages.length < (pageCount + 1) && (
                             <div className="aspect-[3/4] rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-3xl animate-bounce">auto_draw_solid</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;