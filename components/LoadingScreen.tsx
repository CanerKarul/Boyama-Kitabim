import React, { useEffect, useState } from 'react';
import { ColoringPage, ColorInfo } from '../types';
import { GoogleGenAI, Modality, Type } from '@google/genai';

interface LoadingScreenProps {
  name: string;
  pageCount: number;
  theme: string;
  age: number;
  canWrite: boolean;
  onComplete: (pages: ColoringPage[], lang: string) => void;
}

const uiStrings = {
  tr: {
    coverTitle: "Çocuklara Özel Eğlenceli Boyama Kitabı",
    coverSubtitle: "Senin İsteğinle şekilleniyor",
    writingPrompt: "Resimde ne görüyorsun?",
    coverPageTitle: "Kapak Sayfası",
    pageTitle: "Sayfa",
  },
  en: {
    coverTitle: "A Special Coloring Book for Kids",
    coverSubtitle: "Shaped by Your Wishes",
    writingPrompt: "What do you see in the picture?",
    coverPageTitle: "Cover Page",
    pageTitle: "Page",
  }
};

// Safety function to handle potential issues with Turkish characters in AI output
const sanitizeTurkish = (text: string): string => {
    return text
        .replace(/ç/g, 'c').replace(/Ç/g, 'C')
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
        .replace(/ı/g, 'i') // Special case for dotless i
        .replace(/İ/g, 'I') // Special case for dotted I
        .replace(/ö/g, 'o').replace(/Ö/g, 'O')
        .replace(/ş/g, 's').replace(/Ş/g, 'S')
        .replace(/ü/g, 'u').replace(/Ü/g, 'U');
};


const LoadingScreen: React.FC<LoadingScreenProps> = ({ name, pageCount, theme, age, canWrite, onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('Fikirler oluşturuluyor...');
    
    const totalSteps = 1 + 1 + 1 + (pageCount * 2); 
    const [stepsCompleted, setStepsCompleted] = useState(0);

    useEffect(() => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const updateProgress = (newStepsCompleted: number) => {
            setStepsCompleted(newStepsCompleted);
            setProgress((newStepsCompleted / totalSteps) * 100);
        };

        const generatePages = async () => {
            let currentSteps = 0;
            try {
                const generatedPages: ColoringPage[] = [];

                // Step 1: Detect Language
                setStatusText('Kullanıcının dili anlaşılıyor...');
                const langDetectionResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Analyze the theme "${theme}" and determine its primary language. Respond with the common name of the language in English (e.g., "Turkish", "English"). If the theme is just a name, a mix of languages, or unclear, default to "English".`,
                });
                updateProgress(++currentSteps);
                const detectedLanguage = langDetectionResponse.text.trim();
                const langKey = detectedLanguage.toLowerCase().startsWith('tur') ? 'tr' : 'en';
                const s = uiStrings[langKey];

                // Step 2: Generate a list of page ideas
                setStatusText('Hayal gücümüzü çalıştırıyoruz...');
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

                // Step 3: Generate Cover Page
                setStatusText('Kapak sayfası tasarlanıyor...');
                const flagPrompt = langKey === 'tr' ? "Subtly incorporate a small, illustrated, wavy Turkish flag into the design. It should feel like part of the drawing, not a sticker, and should not be in a rigid rectangular shape." : "";
                const coverPrompt = `Create a cover page for a coloring book for a child named '${name}'.
The main title must be: "${s.coverTitle}".
The subtitle must be: "${s.coverSubtitle}, ${name}!". Make sure to include the name '${name}' and the comma.
The theme for the imagery is "${theme}". The user's language is ${detectedLanguage}, please interpret the theme culturally and linguistically appropriately. The imagery should be colorful, vibrant, whimsical, and inviting.
${flagPrompt}
The design should be fun and engaging for children. The text should be beautifully integrated into the overall design.`;

                const coverImageResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: coverPrompt }] },
                    config: { responseModalities: [Modality.IMAGE] },
                });
                updateProgress(++currentSteps);

                let coverImageBase64 = '';
                if (coverImageResponse?.candidates?.[0]?.content?.parts) {
                    for (const part of coverImageResponse.candidates[0].content.parts) {
                        if (part.inlineData) coverImageBase64 = part.inlineData.data;
                    }
                }
                if (!coverImageBase64) throw new Error("Cover image generation failed.");

                generatedPages.push({
                    imageUrl: `data:image/png;base64,${coverImageBase64}`,
                    title: s.coverPageTitle,
                    description: `${name}'s ${theme} Adventure`,
                });


                // Step 4: Generate Coloring Pages
                for (let i = 0; i < pageCount; i++) {
                    const idea = pageIdeas[i % pageIdeas.length] || `${theme} ${i + 1}`;
                    setStatusText(`"${idea}" sayfası çiziliyor...`);
                    
                    const storyPrompt = canWrite ? `At the bottom of the page, include a simple, empty, lined area for the child to write a short story. Add a simple title in ${detectedLanguage} above the lines: "${s.writingPrompt}".` : '';
                    const personalizationPrompt = `Also, subtly and creatively incorporate the child's name, '${name}', into the illustration itself. For example, it could be written in the clouds, on a toy block, or carved on a tree. It should be part of the scene to be colored.`;
                    const pagePrompt = `Create a coloring book page for a child aged ${age}. It should be a simple, clean, black and white line drawing of: "${idea}". This page is part of a book with the overall theme "${theme}" (user language: ${detectedLanguage}). The style should be fun, easy to color, with no shading, no text (except for the story title if requested), thick outlines, and a white background. ${personalizationPrompt} ${storyPrompt}`;
                    
                    const pageImageResponse = await ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: { parts: [{ text: pagePrompt }] },
                        config: { responseModalities: [Modality.IMAGE] },
                    });
                    updateProgress(++currentSteps);

                    let pageImageBase64 = '';
                    if (pageImageResponse?.candidates?.[0]?.content?.parts) {
                        for (const part of pageImageResponse.candidates[0].content.parts) {
                            if (part.inlineData) pageImageBase64 = part.inlineData.data;
                        }
                    }
                    if (!pageImageBase64) {
                        console.warn(`Image generation failed for page ${i+1}. Skipping.`);
                        currentSteps++; 
                        updateProgress(currentSteps);
                        continue;
                    }

                    // Step 5: Generate Color Palette for the page
                    setStatusText(`"${idea}" için renkler seçiliyor...`);
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
                            name: sanitizeTurkish(color.name)
                        }));
                    }

                    generatedPages.push({
                        imageUrl: `data:image/png;base64,${pageImageBase64}`,
                        title: `${s.pageTitle} ${i + 1}`,
                        description: idea,
                        colorPalette: pageColors,
                    });
                }

                onComplete(generatedPages, langKey);

            } catch (error) {
                console.error("Error during page generation:", error);
                alert("Boyama kitabınız oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.");
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
                            <span className="font-bold">2/3</span> Üretim
                        </p>
                    </div>
                </div>
            </header>
            <main className="flex flex-col items-center gap-6">
                <h1 className="font-display text-4xl font-black text-slate-900 dark:text-white sm:text-5xl">
                    {name} için {theme} temalı boyama kitabı oluşturuluyor...
                </h1>
                <div className="relative w-full max-w-md">
                    <div className="h-4 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                            className="h-4 rounded-full bg-primary transition-all duration-500 ease-in-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="absolute -top-6 right-0 text-sm font-medium text-slate-600 dark:text-slate-400">
                        {stepsCompleted} / {totalSteps} adım
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