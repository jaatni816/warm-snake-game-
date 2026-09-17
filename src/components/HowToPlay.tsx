import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Globe } from 'lucide-react';

interface HowToPlayProps {
  onClose: () => void;
}

export default function HowToPlay({ onClose }: HowToPlayProps) {
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  const content = {
    en: {
      title: 'How to Play',
      rules: [
        'Move your mouse or drag your finger to direct your snake.',
        'Eat glowing snake dots to grow longer and increase your score.',
        "If your head touches another snake's body, you die.",
        'If another snake touches your body, they die and drop their glowing dots.',
        'Collect power-ups like Speed, Magnet, and Double Food.',
      ],
      toggle: 'Switch to Hindi (हिंदी)'
    },
    hi: {
      title: 'कैसे खेलें (How to Play)',
      rules: [
        'सांप (snake) को दिशा देने के लिए अपने माउस को हिलाएं या स्क्रीन पर उंगली से स्वाइप करें।',
        'लंबा होने और अपना स्कोर बढ़ाने के लिए चमकते हुए सांप के डॉट्स (snake dots) खाएं।',
        'यदि आपका सिर किसी दूसरे सांप के शरीर से टकराता है, तो आप आउट (die) हो जाएंगे।',
        'यदि कोई दूसरा सांप आपके शरीर को छूता है, तो वह खत्म हो जाएगा और उसके चमकते डॉट्स बिखर जाएंगे जिन्हें आप खा सकते हैं।',
        'स्पीड (Speed), मैग्नेट (Magnet) और डबल फूड (Double Food) जैसे मजेदार पावर-अप्स इकट्ठा करें।',
      ],
      toggle: 'Switch to English'
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-neutral-900 border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md mx-4 flex flex-col relative z-50 text-white"
    >
      <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
        <X className="w-5 h-5 text-white/70" />
      </button>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black">{content[lang].title}</h2>
        <button 
          onClick={() => setLang(l => l === 'en' ? 'hi' : 'en')}
          className="flex items-center gap-2 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors font-medium"
        >
          <Globe className="w-3.5 h-3.5" />
          {content[lang].toggle}
        </button>
      </div>

      <ul className="space-y-4 mb-6">
        {content[lang].rules.map((rule, idx) => (
          <li key={idx} className="flex gap-3 text-neutral-300 text-sm leading-relaxed">
            <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
              {idx + 1}
            </span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>
      
      <button 
        onClick={onClose}
        className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors"
      >
        Got it!
      </button>
    </motion.div>
  );
}
