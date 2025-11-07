import React, { useEffect, useState } from 'react';
import { ColoringPage, ColorInfo } from '../types';
import { GoogleGenAI, Modality, Type, GenerateContentResponse } from '@google/genai';

interface LoadingScreenProps {
  name: string;
  pageCount: number;
  theme: string;
  age: number;
  canWrite: boolean;
  onComplete: (pages: ColoringPage[]) => void;
  language: string;
}

const uiStrings = {
  tr: {
    coverTitle: "Çocuklara Özel Eğlenceli Boyama Kitabı",
    coverSubtitle: "Senin İsteğinle şekilleniyor",
    writingPrompt: "Resimde ne goruyorsun? (Kisaca anlat)",
    coverPageTitle: "Kapak Sayfası",
    pageTitle: "Sayfa",
    generatingIdeas: "Fikirler oluşturuluyor...",
    designingCover: "Kapak sayfası tasarlanıyor...",
    drawingPage: (idea: string) => `"${idea}" sayfası çiziliyor...`,
    pickingColors: (idea: string) => `"${idea}" için renkler seçiliyor...`,
    generatingTitle: (name: string, theme: string) => `${name} için ${theme} temalı boyama kitabı oluşturuluyor...`,
    stepLabel: "Üretim",
    rateLimitError: "Boyama kitabı fabrikası şu anda çok meşgul! Lütfen birkaç dakika sonra tekrar deneyin.",
    internalError: "Yapay zeka modeli geçici bir sorun yaşadı. Lütfen kitabınızı yeniden oluşturmayı deneyin."
  },
  en: {
    coverTitle: "A Special Coloring Book for Kids",
    coverSubtitle: "Shaped by Your Wishes",
    writingPrompt: "What do you see in the picture? (Tell a short story)",
    coverPageTitle: "Cover Page",
    pageTitle: "Page",
    generatingIdeas: "Generating ideas...",
    designingCover: "Designing cover page...",
    drawingPage: (idea: string) => `Drawing "${idea}" page...`,
    pickingColors: (idea: string) => `Picking colors for "${idea}"...`,
    generatingTitle: (name: string, theme: string) => `Creating a ${theme} coloring book for ${name}...`,
    stepLabel: "Generation",
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


const LoadingScreen: React.FC<LoadingScreenProps> = ({ name, pageCount, theme, age, canWrite, onComplete, language }) => {
    const s = uiStrings[language as keyof typeof uiStrings] || uiStrings.tr;
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState(s.generatingIdeas);
    
    const totalSteps = 1 + 1 + (pageCount * 2); 
    const [stepsCompleted, setStepsCompleted] = useState(0);

    useEffect(() => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const highQualityImageModel = 'gemini-2.5-flash-image';
        const standardImageModel = 'gemini-2.0-flash-preview-image-generation';

        const updateProgress = (newStepsCompleted: number) => {
            setStepsCompleted(newStepsCompleted);
            setProgress((newStepsCompleted / totalSteps) * 100);
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
                         return imageBase64; // Success
                    }
                    
                    lastError = new Error("Model response did not contain valid image data.");
        
                } catch (error) {
                    lastError = error as Error;
                    console.warn(`Attempt ${i + 1} failed for model ${model}. Retrying in 2s...`, error);
                    
                    if (error instanceof Error && (error.message.includes('"code":400') || error.message.includes('"code":429'))) {
                        throw lastError;
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            throw lastError || new Error(`Failed to generate image with model ${model} after ${maxRetries} attempts.`);
        };

        const generatePages = async () => {
            let currentSteps = 0;
            try {
                const generatedPages: ColoringPage[] = [];
                const langKey = language;
                const detectedLanguage = langKey === 'tr' ? 'Turkish' : 'English';

                // Step 1: Generate a list of page ideas
                setStatusText(s.generatingIdeas);
                const ideasResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Generate a list of ${pageCount} simple, one or two-word ideas in English for coloring book pages. The theme is "${theme}". The user's language is ${detectedLanguage}. Please interpret the theme correctly. For example, if the theme is 'aile' and language is 'Turkish', it means 'family'. Return a single JSON object with a key "ideas" containing an array of strings.`,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                ideas: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ['ideas']
                        }
                    }
                });
                updateProgress(++currentSteps);
                
                const responseText = ideasResponse.text.trim().replace(/^```json\s*/, '').replace(/```$/, '');
                const pageIdeas: string[] = JSON.parse(responseText).ideas;

                // Step 2: Generate Cover Page
                setStatusText(s.designingCover);
                const flagPrompt = langKey === 'tr' ? "Subtly incorporate a small, illustrated, wavy Turkish flag into the design. It should feel like part of the drawing, not a sticker, and should not be in a rigid rectangular shape." : "";
                
                const coverTitleText = transliterateTurkish(s.coverTitle);
                const coverSubtitleText = transliterateTurkish(s.coverSubtitle);
                const coverName = transliterateTurkish(name);

                const coverPrompt = `Create a cover page for a coloring book for a child named '${name}'.
The main title must be written EXACTLY as: "${coverTitleText}". Do not change the spelling or wording.
The subtitle must be written EXACTLY as: "${coverSubtitleText}, ${coverName}!". Make sure to include the name '${coverName}' and the comma. Do not change the spelling.
The theme for the imagery is "${theme}". The user's language is ${detectedLanguage}, please interpret the theme culturally and linguistically appropriately. The imagery should be colorful, vibrant, whimsical, and inviting.
${flagPrompt}
The design should be fun and engaging for children. The text must be beautifully integrated into the overall design. Render the text clearly and without spelling errors.`;

                const coverImageBase64 = await generateImageWithRetry(
                    highQualityImageModel, 
                    coverPrompt, 
                    { responseModalities: [Modality.IMAGE] }
                );
                updateProgress(++currentSteps);

                if (!coverImageBase64) throw new Error("Cover image generation failed after retries.");

                generatedPages.push({
                    imageUrl: `data:image/png;base64,${coverImageBase64}`,
                    title: s.coverPageTitle,
                    description: `${name}'s ${theme} Adventure`,
                });


                // Step 3: Generate Coloring Pages
                for (let i = 0; i < pageCount; i++) {
                    const idea = pageIdeas[i % pageIdeas.length] || `${theme} ${i + 1}`;
                    setStatusText(s.drawingPage(idea));
                    
                    const storyPrompt = canWrite ? `At the bottom of the page, include a simple, empty, lined area for the child to write. Above the lines, add a title written EXACTLY as: "${s.writingPrompt}". Do not change the spelling or wording of this title.` : '';
                    const personalizationPrompt = `Also, subtly and creatively incorporate the child's name, '${name}', into the illustration itself. For example, it could be written in the clouds, on a toy block, or carved on a tree. It should be part of the scene to be colored.`;
                    const pagePrompt = `Create a coloring book page for a child aged ${age}. It should be a simple, clean, black and white line drawing of: "${idea}". This page is part of a book with the overall theme "${theme}" (user language: ${detectedLanguage}). The style should be fun, easy to color, with no shading, no text (except for the story title if requested), thick outlines, and a white background. ${personalizationPrompt} ${storyPrompt}`;
                    
                    const pageImageModel = i % 2 === 0 ? standardImageModel : highQualityImageModel;

                    const pageImageConfig = {
                        responseModalities: pageImageModel === standardImageModel
                            ? [Modality.TEXT, Modality.IMAGE]
                            : [Modality.IMAGE]
                    };

                    const pageImageBase64 = await generateImageWithRetry(
                        pageImageModel,
                        pagePrompt,
                        pageImageConfig
                    );
                    updateProgress(++currentSteps);

                    if (!pageImageBase64) {
                        console.warn(`Image generation failed for page ${i+1} after retries. Skipping.`);
                        currentSteps++; 
                        updateProgress(currentSteps);
                        continue;
                    }

                    // Step 4: Generate Color Palette for the page
                    setStatusText(s.pickingColors(idea));
                    const palettePrompt = `Based on this coloring page of a "${idea}", suggest a 5-color palette for a child. Return a JSON object with a key "colors" containing an array of objects. Each object must have "hex" (hex code) and "name". The "name" MUST be accurately translated into ${detectedLanguage}. For Turkish, you MUST use the correct Turkish characters (e.g., 'ı', 'ğ', 'ü', 'ş', 'ö', 'ç'). Do NOT replace them with other characters. The spelling MUST be perfect.`;
                    const paletteResponse = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: {
                            parts: [
                                { inlineData: { mimeType: 'image/png', data: pageImageBase64 } },
                                { text: palettePrompt }
                            ]
                        },
                        config: {
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: Type.OBJECT,
                                properties: {
                                    colors: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                hex: { type: Type.STRING },
                                                name: { type: Type.STRING }
                                            },
                                            required: ['hex', 'name']
                                        }
                                    }
                                },
                                required: ['colors']
                            }
                        }
                    });
                    updateProgress(++currentSteps);
                    const paletteText = paletteResponse.text.trim().replace(/^```json\s*/, '').replace(/```$/, '');
                    let pageColors: ColorInfo[] = JSON.parse(paletteText).colors;

                    if (langKey === 'tr') {
                        pageColors = pageColors.map(color => ({
                            ...color,
                            name: transliterateTurkish(color.name)
                        }));
                    }

                    generatedPages.push({
                        imageUrl: `data:image/png;base64,${pageImageBase64}`,
                        title: `${idea}`,
                        description: `${s.pageTitle} ${i + 1}`,
                        colorPalette: pageColors,
                    });
                }

                onComplete(generatedPages);

            } catch (error) {
                console.error("Error during page generation:", error);
                let errorMessage = "An error occurred while creating your coloring book. Please try again.";
                if (error instanceof Error) {
                    if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('429')) {
                        errorMessage = s.rateLimitError;
                    } else if (error.message.includes('"code":500') || error.message.includes('INTERNAL')) {
                        errorMessage = s.internalError;
                    } else {
                        errorMessage = `Error during page generation:\n${error.message}`;
                    }
                }
                alert(errorMessage);
                window.location.reload();
            }
        };

        generatePages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex flex-1 flex-col items-center justify-center text-center p-4">
            <header aria-label="Sayfa Başlığı" className="absolute top-0 left-0 right-0 z-20 p-4">
                <div className="flex items-center justify-center p-2">
                    <div className="rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-sm px-4 py-2">
                        <p aria-live="polite" className="font-medium text-text-light dark:text-text-dark text-sm" role="status">
                            <span className="font-bold">2/3</span> {s.stepLabel}
                        </p>
                    </div>
                </div>
            </header>
            <main className="flex flex-col items-center gap-6">
                <h1 className="font-display text-4xl font-black text-slate-900 dark:text-white sm:text-5xl">
                    {s.generatingTitle(name, theme)}
                </h1>
                <div className="relative w-full max-w-md">
                    <div className="h-4 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                            className="h-4 rounded-full bg-primary transition-all duration-500 ease-in-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="absolute -top-6 right-0 text-sm font-medium text-slate-600 dark:text-slate-400">
                        {stepsCompleted} / {totalSteps} {language === 'tr' ? 'adım' : 'steps'}
                    </p>
                </div>
                <p className="text-slate-500 dark:text-slate-400 h-6">
                    {statusText}
                </p>
                <div className="text-6xl text-accent animate-bounce">
                    <span className="material-symbols-outlined">palette</span>
                </div>
                 <div className="relative w-64 h-8 overflow-hidden mt-4">
                    <div className="absolute inset-0 flex items-center justify-center gap-4">
                        <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-500 animate-page-fly">auto_draw_solid</span>
                        <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-500 animate-page-fly animation-delay-200">auto_draw_solid</span>
                        <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-500 animate-page-fly animation-delay-400">auto_draw_solid</span>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoadingScreen;