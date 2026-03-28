import { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, Image as ImageIcon, Loader2, Download, RefreshCw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MEDIUMS = [
  { id: 'mug', name: 'Coffee Mug', prompt: 'Edit this image to place the product or design naturally on a ceramic coffee mug. Professional product photography, studio lighting.' },
  { id: 'billboard', name: 'Billboard', prompt: 'Edit this image to place the product or design on a large outdoor billboard in a bustling city. Realistic lighting and perspective.' },
  { id: 'tshirt', name: 'T-Shirt', prompt: 'Edit this image to place the product or design on a high-quality cotton t-shirt worn by a model. Realistic fabric folds and lighting.' },
  { id: 'tote', name: 'Tote Bag', prompt: 'Edit this image to place the product or design on a canvas tote bag. Lifestyle photography, natural lighting.' },
  { id: 'instagram', name: 'Instagram Post', prompt: 'Edit this image to make it look like a trendy Instagram post on a smartphone screen.' },
  { id: 'laptop', name: 'Laptop Screen', prompt: 'Edit this image to display the product or design on a modern laptop screen sitting on a wooden desk.' },
];

export default function App() {
  const [sourceImage, setSourceImage] = useState<{ url: string; data: string; mimeType: string } | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, { url: string; loading: boolean; error?: string }>>({});
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      setSourceImage({
        url: base64String,
        data: base64Data,
        mimeType: file.type,
      });
      setGeneratedImages({}); // Reset generated images
    };
    reader.readAsDataURL(file);
  };

  const generateMockup = async (mediumId: string, prompt: string) => {
    if (!sourceImage) return;

    setGeneratedImages(prev => ({
      ...prev,
      [mediumId]: { url: '', loading: true }
    }));

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: sourceImage.data,
                mimeType: sourceImage.mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setGeneratedImages(prev => ({
          ...prev,
          [mediumId]: { url: imageUrl, loading: false }
        }));
      } else {
        throw new Error('No image generated');
      }
    } catch (error: any) {
      console.error(`Error generating ${mediumId}:`, error);
      setGeneratedImages(prev => ({
        ...prev,
        [mediumId]: { url: '', loading: false, error: error.message || 'Failed to generate' }
      }));
    }
  };

  const generateAll = async () => {
    if (!sourceImage) return;
    setIsGeneratingAll(true);
    
    // Process sequentially to avoid rate limits
    for (const medium of MEDIUMS) {
      await generateMockup(medium.id, medium.prompt);
    }
    
    setIsGeneratingAll(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-[#0a0a0a] font-sans flex flex-col md:flex-row">
      {/* Left Panel: Upload & Controls */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-white border-r border-gray-200 p-6 flex flex-col h-screen sticky top-0 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            Mockup Magic
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Visualize your product across different marketing mediums instantly.
          </p>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          {/* Upload Area */}
          <div>
            <h2 className="text-sm font-medium mb-3 uppercase tracking-wider text-gray-500">Source Image</h2>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${sourceImage ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
              {sourceImage ? (
                <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-sm">
                  <img src={sourceImage.url} alt="Source" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-medium flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Change Image
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="font-medium text-gray-900">Click to upload</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                </>
              )}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={generateAll}
            disabled={!sourceImage || isGeneratingAll}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Mockups...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate All Mockups
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Panel: Results Grid */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-[#f5f5f4]">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold">Generated Mockups</h2>
            <span className="text-sm text-gray-500">{Object.keys(generatedImages).length} / {MEDIUMS.length} generated</span>
          </div>

          {!sourceImage ? (
            <div className="h-[60vh] flex flex-col items-center justify-center text-gray-400">
              <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Upload an image to get started</p>
              <p className="text-sm mt-2 max-w-md text-center">Your product will be magically placed into various marketing contexts using generative AI.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence>
                {MEDIUMS.map((medium) => {
                  const result = generatedImages[medium.id];
                  
                  return (
                    <motion.div
                      key={medium.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col group"
                    >
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h3 className="font-medium text-gray-900">{medium.name}</h3>
                        {result?.url && (
                          <a 
                            href={result.url} 
                            download={`${medium.id}-mockup.png`}
                            className="text-gray-400 hover:text-indigo-600 transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      
                      <div className="aspect-square relative bg-gray-100 flex items-center justify-center overflow-hidden">
                        {result?.loading ? (
                          <div className="flex flex-col items-center text-indigo-500">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <span className="text-xs font-medium uppercase tracking-wider">Generating</span>
                          </div>
                        ) : result?.error ? (
                          <div className="p-6 text-center text-red-500">
                            <p className="text-sm font-medium mb-2">Generation Failed</p>
                            <p className="text-xs opacity-80">{result.error}</p>
                            <button 
                              onClick={() => generateMockup(medium.id, medium.prompt)}
                              className="mt-4 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 py-1.5 px-3 rounded-full transition-colors"
                            >
                              Retry
                            </button>
                          </div>
                        ) : result?.url ? (
                          <img 
                            src={result.url} 
                            alt={`${medium.name} mockup`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="text-gray-400 flex flex-col items-center">
                            <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                            <span className="text-xs font-medium uppercase tracking-wider opacity-50">Waiting</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
