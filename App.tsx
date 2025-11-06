import React, { useState, useCallback, useEffect } from 'react';
import { AppScreen, ColoringPage, GenerationData } from './types';
import HomeScreen from './components/HomeScreen';
import LoadingScreen from './components/LoadingScreen';
import PreviewScreen from './components/PreviewScreen';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.Home);
  const [generationData, setGenerationData] = useState<GenerationData | null>(null);
  const [generatedPages, setGeneratedPages] = useState<ColoringPage[]>([]);
  const [language, setLanguage] = useState('tr'); // 'tr' or 'en'

  useEffect(() => {
    // Check for dark mode preference
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleStartGeneration = useCallback((data: GenerationData) => {
    setGenerationData(data);
    setScreen(AppScreen.Loading);
  }, []);

  const handleGenerationComplete = useCallback((pages: ColoringPage[], lang: string) => {
    setGeneratedPages(pages);
    setLanguage(lang);
    setScreen(AppScreen.Preview);
  }, []);

  const handleEdit = useCallback(() => {
    setGenerationData(null);
    setGeneratedPages([]);
    setLanguage('tr'); // Reset to default on going home
    setScreen(AppScreen.Home);
  }, []);

  const handleRegenerate = useCallback(() => {
    setGeneratedPages([]);
    setScreen(AppScreen.Loading);
  }, []);

  const renderScreen = () => {
    switch (screen) {
      case AppScreen.Loading:
        return (
          <LoadingScreen
            name={generationData?.name || ''}
            pageCount={generationData?.pageCount || 1}
            theme={generationData?.theme || ''}
            age={generationData?.age || 6}
            canWrite={generationData?.canWrite || false}
            onComplete={handleGenerationComplete}
          />
        );
      case AppScreen.Preview:
        return (
          <PreviewScreen
            name={generationData?.name || ''}
            theme={generationData?.theme || ''}
            pages={generatedPages}
            onEdit={handleEdit}
            onRegenerate={handleRegenerate}
            language={language}
          />
        );
      case AppScreen.Home:
      default:
        return <HomeScreen onGenerate={handleStartGeneration} />;
    }
  };

  return <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">{renderScreen()}</div>;
};

export default App;