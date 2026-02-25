
import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

const AIGaitAnalyzer: React.FC = () => {
  const [activityType, setActivityType] = useState('Trail Running');
  const [terrain, setTerrain] = useState('Mountainous');
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsight = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `I am doing ${activityType} on ${terrain} terrain. Provide a professional, concise athlete insight about how my gait should adjust for maximum efficiency and how Stryde's offline sensors help in this specific scenario. Limit to 3 sentences.`,
        config: {
          temperature: 0.7,
        }
      });
      setInsight(response.text || "Unable to generate insight at this time.");
    } catch (error) {
      console.error("AI Generation error:", error);
      setInsight("Our AI engine is currently busy calibrating. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="ai-insights" className="max-w-7xl mx-auto py-24 px-4">
      <div className="bg-gradient-to-br from-[#1c2720] to-background-dark border border-primary/20 rounded-[2.5rem] p-8 md:p-16 flex flex-col lg:flex-row gap-16 items-center">
        <div className="lg:w-1/2 flex flex-col gap-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
            <span className="text-primary text-[10px] font-black uppercase tracking-widest">Powered by Gemini AI</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">Instant Performance <br/>Context.</h2>
          <p className="text-[#9db9a8] text-lg leading-relaxed">
            Stryde's on-device AI doesn't just track data—it understands context. Describe your session to see how our engine adapts to your needs.
          </p>
          
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-primary uppercase tracking-widest mb-2 block">Activity</label>
                <select 
                  value={activityType} 
                  onChange={(e) => setActivityType(e.target.value)}
                  className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                >
                  <option>Trail Running</option>
                  <option>Speed Walking</option>
                  <option>Urban Sprinting</option>
                  <option>Hiking</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-primary uppercase tracking-widest mb-2 block">Terrain</label>
                <select 
                  value={terrain} 
                  onChange={(e) => setTerrain(e.target.value)}
                  className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                >
                  <option>Mountainous</option>
                  <option>Beach / Sand</option>
                  <option>Paved Asphalt</option>
                  <option>Dense Forest</option>
                </select>
              </div>
            </div>
            <button 
              onClick={generateInsight}
              disabled={loading}
              className="mt-4 bg-primary text-background-dark font-black h-14 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <div className="size-5 border-2 border-background-dark border-t-transparent animate-spin rounded-full"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined">psychology</span>
                  Get AI Insight
                </>
              )}
            </button>
          </div>
        </div>

        <div className="lg:w-1/2 w-full min-h-[300px] flex items-center justify-center bg-background-dark/50 rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
          {!insight && !loading && (
            <div className="text-center">
              <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl">rocket_launch</span>
              </div>
              <p className="text-[#9db9a8] font-medium italic">Ready to analyze your next session...</p>
            </div>
          )}
          
          {loading && (
             <div className="flex flex-col items-center gap-4">
                <div className="size-16 border-4 border-primary/20 border-t-primary animate-spin rounded-full"></div>
                <p className="text-primary text-sm font-black uppercase tracking-widest animate-pulse">Computing Gait Vectors...</p>
             </div>
          )}

          {insight && !loading && (
            <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <span className="material-symbols-outlined text-primary text-4xl mb-4">format_quote</span>
               <p className="text-xl md:text-2xl text-white font-medium leading-relaxed italic">
                 {insight}
               </p>
               <div className="mt-8 pt-8 border-t border-white/10 flex items-center gap-4">
                  <div className="size-10 rounded-full bg-primary flex items-center justify-center text-background-dark font-black">S</div>
                  <div>
                    <p className="text-white font-bold text-sm">Stryde Insight Engine</p>
                    <p className="text-[#9db9a8] text-xs">Analysis complete for {activityType}</p>
                  </div>
               </div>
            </div>
          )}
          
          {/* Decorative background for the AI result box */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          <div className="absolute -top-1/2 -left-1/2 size-full bg-primary/5 rounded-full blur-[100px] group-hover:bg-primary/10 transition-all duration-1000"></div>
        </div>
      </div>
    </section>
  );
};

export default AIGaitAnalyzer;
