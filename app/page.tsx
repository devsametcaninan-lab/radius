'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Radio, Sparkles, Sliders, ArrowLeft, MessageSquare, LogOut, Trash2, Heart, MapPin } from 'lucide-react';

interface Gonderi {
  id: string;
  icerik: string;
  takma_ad: string;
  enlem: number;
  boylam: number;
  user_id: string;
  created_at: string;
  hesaplananMesafe?: number;
  begeniSayisi?: number;
  begenilerListesi?: any[];
}

interface Yorum {
  id: string;
  gonderi_id: string;
  icerik: string;
  takma_ad: string;
  user_id: string;
  created_at: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [yeniMetin, setYeniMetin] = useState('');
  const [takmaAd, setTakmaAd] = useState('');
  const [gonderiler, setGonderiler] = useState<Gonderi[]>([]); 
  const [konum, setKonum] = useState<{ enlem: number; boylam: number } | null>(null);
  const [konumIzniIstendi, setKonumIzniIstendi] = useState<boolean>(false);
  const [konumHataMesaji, setKonumHataMesaji] = useState<string>('');
  const [yariCap, setYariCap] = useState<number>(10);
  const [seciliGonderi, setSeciliGonderi] = useState<Gonderi | null>(null); 
  const [yorumlar, setYorumlar] = useState<Yorum[]>([]);
  const [yeniYorum, setYeniYorum] = useState('');
  const [kullanici, setKullanici] = useState<any>(null);

  // Verileri getirme motoru
  const verileriGetir = useCallback(async (lat: number, lng: number, radiusKm: number) => {
    const { data: gonderilerData, error: gonderiError } = await supabase.from('gonderiler').select('*').order('created_at', { ascending: false });
    const { data: begenilerData, error: begeniError } = await supabase.from('begeniler').select('*');

    if (!gonderiError && !begeniError && gonderilerData) {
      const yerelYazilar = gonderilerData.map((g) => {
        const gonderiBegenileri = begenilerData ? begenilerData.filter((b) => b.gonderi_id === g.id) : [];
        
        const R = 6371;
        const dLat = (g.enlem - lat) * Math.PI / 180;
        const dLng = (g.boylam - lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat * Math.PI / 180) * Math.cos(g.enlem * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const mesafe = R * c;
        
        return {
          ...g,
          hesaplananMesafe: mesafe,
          begeniSayisi: gonderiBegenileri.length,
          begenilerListesi: gonderiBegenileri
        };
      }).filter((g) => g.hesaplananMesafe <= radiusKm);

      setGonderiler(yerelYazilar);
    }
  }, []);

  // Konum Yakalama Fonksiyonu
  const konumuTetikle = useCallback(() => {
    if (navigator.geolocation) {
      setKonumIzniIstendi(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gercekKonum = { enlem: position.coords.latitude, boylam: position.coords.longitude };
          setKonum(gercekKonum);
          setKonumHataMesaji('');
          verileriGetir(gercekKonum.enlem, gercekKonum.boylam, yariCap);
        },
        (error) => {
          console.error("Konum hatası:", error);
          setKonumHataMesaji('Konum izni reddedildi. Yakınındakileri görebilmek için tarayıcı ayarlarından konum izni vermen gerekiyor kardo.');
          const varsayilan = { enlem: 36.78, boylam: 34.60 }; // Mersin Varsayılan
          setKonum(varsayilan);
          verileriGetir(varsayilan.enlem, varsayilan.boylam, yariCap);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setKonumHataMesaji('Tarayıcın konum özelliğini desteklemiyor.');
    }
  }, [yariCap, verileriGetir]);

  useEffect(() => {
    const anonimIsimUret = () => {
      const sifatlar = ['Pozcu', 'Meü', 'Korsan', 'Gizli', 'Mersin', 'Efsane', 'Gece', 'Mavi'];
      const isimler = ['Kurt', 'Yildiz', 'Yazilimci', 'Gezgin', 'Golge', 'Kral', 'Firtina'];
      return `@${sifatlar[Math.floor(Math.random() * sifatlar.length)]}_${isimler[Math.floor(Math.random() * isimler.length)]}_${Math.floor(10 + Math.random() * 90)}`;
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setKullanici(session.user);
        let localName = localStorage.getItem('radius_username');
        if (!localName) {
          localName = anonimIsimUret();
          localStorage.setItem('radius_username', localName);
        }
        setTakmaAd(localName);
        konumuTetikle();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setKullanici(session.user);
        let localName = localStorage.getItem('radius_username');
        if (!localName) {
          localName = anonimIsimUret();
          localStorage.setItem('radius_username', localName);
        }
        setTakmaAd(localName);
        konumuTetikle();
      } else {
        setKullanici(null);
        setTakmaAd('');
        setKonum(null);
        setKonumIzniIstendi(false);
      }
    });

    return () => { 
      subscription.unsubscribe();
    };
  }, [konumuTetikle]);

  // Km değiştiğinde verileri tazelemek için dinamik takip
  useEffect(() => {
    if (konum) {
      verileriGetir(konum.enlem, konum.boylam, yariCap);
    }
  }, [yariCap, konum, verileriGetir]);

  // Canlı Akış Dinleyicileri (Realtime)
  useEffect(() => {
    if (!konum) return;

    const gonderiKanali = supabase.channel('gonderi-takip')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gonderiler' }, () => {
        verileriGetir(konum.enlem, konum.boylam, yariCap);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'gonderiler' }, (payload: any) => {
        // ANLIK SİLME HATASI FIX: Silinen id'yi listeden anında uçur
        setGonderiler((eski) => eski.filter(g => g.id !== payload.old.id));
        verileriGetir(konum.enlem, konum.boylam, yariCap);
      }).subscribe();

    const begeniKanali = supabase.channel('begeni-takip')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'begeniler' }, () => {
        verileriGetir(konum.enlem, konum.boylam, yariCap);
      }).subscribe();

    const columnYorumTakip = supabase.channel('yorum-takip')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'yorumlar' }, (payload: any) => {
        setYorumlar((eski) => {
          if (seciliGonderi && payload.new.gonderi_id === seciliGonderi.id) {
            if (eski.some(y => y.id === payload.new.id)) return eski;
            return [...eski, payload.new];
          }
          return eski;
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'yorumlar' }, (payload: any) => {
        setYorumlar((eski) => eski.filter((y) => y.id !== payload.old.id));
      }).subscribe();

    return () => {
      supabase.removeChannel(gonderiKanali);
      supabase.removeChannel(begeniKanali);
      supabase.removeChannel(columnYorumTakip);
    };
  }, [konum, yariCap, seciliGonderi, verileriGetir]);

  const googleIleGiris = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const cikisYap = async () => {
    await supabase.auth.signOut();
  };

  const gonderiFirlat = async () => {
    if (!yeniMetin || !konum || !kullanici) return;
    await supabase.from('gonderiler').insert([
      { icerik: yeniMetin, takma_ad: takmaAd, enlem: konum.enlem, boylam: konum.boylam, user_id: kullanici.id }
    ]);
    setYeniMetin('');
  };

  const gonderiSil = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bu fırlatmayı tamamen silmek istediğine emin misin?')) {
      // Önce yerel state'den anında sil ki arayüz kilitlenmesin
      setGonderiler((eski) => eski.filter(g => g.id !== id));
      await supabase.from('gonderiler').delete().eq('id', id);
    }
  };

  const gonderiDetayAc = async (gonderi: Gonderi) => {
    setSeciliGonderi(gonderi);
    const { data } = await supabase.from('yorumlar').select('*').eq('gonderi_id', gonderi.id).order('created_at', { ascending: true });
    if (data) setYorumlar(data);
  };

  const yorumFirlat = async () => {
    if (!yeniYorum || !seciliGonderi || !kullanici) return;
    await supabase.from('yorumlar').insert([
      { gonderi_id: seciliGonderi.id, icerik: yeniYorum, takma_ad: takmaAd, user_id: kullanici.id }
    ]);
    setYeniYorum('');
  };

  const yorumSil = async (id: string) => {
    if (confirm('Bu yorumu silmek istediğine emin misin?')) {
      setYorumlar((eski) => eski.filter(y => y.id !== id));
      await supabase.from('yorumlar').delete().eq('id', id);
    }
  };

  // Beğeni Mekanizması
  const begeniAt = async (gonderiId: string, e: React.MouseEvent, begenilerListesi: any[]) => {
    e.stopPropagation(); 
    if (!kullanici) return;

    const varOlanBegeni = begenilerListesi ? begenilerListesi.find((b) => b.user_id === kullanici.id) : null;

    setGonderiler((eskiGonderiler) => 
      eskiGonderiler.map((g) => {
        if (g.id === gonderiId) {
          const yeniList = varOlanBegeni 
            ? (g.begenilerListesi?.filter(b => b.id !== varOlanBegeni.id) || [])
            : [...(g.begenilerListesi || []), { id: 'gecici-id', gonderi_id: gonderiId, user_id: kullanici.id }];
          return {
            ...g,
            begeniSayisi: yeniList.length,
            begenilerListesi: yeniList
          };
        }
        return g;
      })
    );

    if (seciliGonderi && seciliGonderi.id === gonderiId) {
      setSeciliGonderi((eski) => {
        if (!eski) return null;
        const yeniList = varOlanBegeni 
          ? (eski.begenilerListesi?.filter(b => b.id !== varOlanBegeni.id) || [])
          : [...(eski.begenilerListesi || []), { id: 'gecici-id', gonderi_id: gonderiId, user_id: kullanici.id }];
        return {
          ...eski,
          begeniSayisi: yeniList.length,
          begenilerListesi: yeniList
        };
      });
    }

    if (varOlanBegeni) {
      await supabase.from('begeniler').delete().eq('id', varOlanBegeni.id);
    } else {
      await supabase.from('begeniler').insert([
        { gonderi_id: gonderiId, user_id: kullanici.id }
      ]);
    }
  };

  // GİRİŞ YAPILMAMIŞSA GÖSTERİLECEK EKRAN
  if (!kullanici) {
    return (
      <main className="w-full max-w-md mx-auto min-h-screen bg-[#030303] text-zinc-100 font-sans p-6 flex flex-col items-center justify-center space-y-6 select-none overflow-hidden">
        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)] animate-pulse">
          <Radio className="w-7 h-7 text-black stroke-[2.5]" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tighter">radius</h1>
          <p className="text-xs text-zinc-400 max-w-[280px] mx-auto leading-relaxed">Maskeni takarak yakınındakilerle tamamen sansürsüz konuşmaya başla.</p>
        </div>
        <button 
          onClick={googleIleGiris}
          className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3 px-6 rounded-2xl transition duration-300 flex items-center justify-center gap-3 shadow-lg active:scale-95 text-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google ile Tek Tıkla Giriş Yap
        </button>
      </main>
    );
  }

  // MOBİL İÇİN KONUM İZNİ İSTEME EKRANI (PRODÜKSİYON FIX)
  if (!konum && !konumHataMesaji) {
    return (
      <main className="w-full max-w-md mx-auto min-h-screen bg-[#030303] text-zinc-100 font-sans p-6 flex flex-col items-center justify-center space-y-6 text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center animate-bounce">
          <MapPin className="w-6 h-6 text-cyan-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Konum Aranıyor...</h2>
          <p className="text-xs text-zinc-400 max-w-[260px] mx-auto leading-relaxed">
            Radius, çevrendeki fırlatmaları yakalayabilmek için güvenli şekilde konum bilgine ihtiyaç duyar.
          </p>
        </div>
        {!konumIzniIstendi && (
          <button 
            onClick={konumuTetikle}
            className="bg-cyan-400 hover:bg-cyan-500 text-black font-bold text-xs px-6 py-3 rounded-2xl transition shadow-lg active:scale-95"
          >
            Konumu Paylaş ve Başla
          </button>
        )}
      </main>
    );
  }

  // ANA UYGULAMA EKRANI (TAM RESPONSIVE / MOBİL UYUMLU)
  return (
    <main className="w-full max-w-md mx-auto min-h-screen bg-[#030303] text-zinc-100 font-sans px-4 pt-2 pb-12 antialiased selection:bg-cyan-500 selection:text-black overscroll-none">
      
      {/* BAŞLIK VE ÇIKIŞ */}
      <div className="flex justify-between items-center py-3 border-b border-zinc-900 sticky top-0 bg-[#030303]/90 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-cyan-400" />
          <h1 className="text-xl font-black tracking-tighter">radius</h1>
        </div>
        <button onClick={cikisYap} className="text-zinc-500 hover:text-red-400 transition p-1 text-[10px] flex items-center gap-1 font-semibold bg-zinc-950 border border-zinc-900 px-2 py-1 rounded-xl">
          Kapat <LogOut className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* KONUM HATA UYARISI */}
      {konumHataMesaji && (
        <div className="my-3 p-3 rounded-2xl bg-red-950/20 border border-red-900/40 text-[11px] text-red-400 leading-relaxed font-medium">
          ⚠️ {konumHataMesaji}
        </div>
      )}

      <AnimatePresence mode="wait">
        {!seciliGonderi ? (
          <motion.div key="duvar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4 mt-4">
            
            {/* RANGE SLIDER (KİLOMETRE ALANI) */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 shadow-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-cyan-400" /> Tarama Alanı</span>
                <span className="text-cyan-400 font-mono text-xs bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded-md font-bold">{yariCap} KM</span>
              </div>
              <input type="range" min="1" max="50" value={yariCap} onChange={(e) => setYariCap(Number(e.target.value))} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"/>
            </div>

            {/* GÖNDERİ FIRLATMA KUTUSU */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 shadow-2xl space-y-3">
              <textarea value={yeniMetin} onChange={(e) => setYeniMetin(e.target.value)} placeholder={`${takmaAd} olarak buraya bir şey fırlat...`} className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none resize-none field-sizing-content" rows={3} maxLength={280}/>
              <div className="flex justify-between items-center pt-2 border-t border-zinc-900">
                <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1"><Sparkles className="w-3 h-3 text-yellow-500" /> Kimliğin Şifreli</span>
                <button onClick={gonderiFirlat} className="bg-cyan-400 hover:bg-cyan-500 text-black font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-[0_5px_15px_rgba(34,211,238,0.25)] transition active:scale-95">Fırlat <Send className="w-3 h-3" /></button>
              </div>
            </div>

            {/* AKIŞ DUVARI */}
            <div className="space-y-3">
              {gonderiler.length === 0 ? (
                <div className="text-center py-10 text-xs text-zinc-600 font-medium">Bu menzilde henüz kimse maskesini çıkarmamış kardo...</div>
              ) : (
                gonderiler.map((g, idx) => {
                  const kullaniciBegenmisMi = g.begenilerListesi && kullanici ? g.begenilerListesi.some((b: any) => b.user_id === kullanici.id) : false;
                  
                  return (
                    <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.02, 0.15) }} onClick={() => gonderiDetayAc(g)} className="bg-zinc-950 border border-zinc-900 hover:border-zinc-850 rounded-2xl p-4 shadow-xl space-y-3 cursor-pointer group transition duration-150 relative overflow-hidden active:bg-zinc-900/30">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono text-yellow-500/90 font-bold">{g.takma_ad}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                            {g.hesaplananMesafe ? `${g.hesaplananMesafe.toFixed(1)} km uzakta` : 'Çok Yakın'}
                          </span>
                          {kullanici && g.user_id === kullanici.id && (
                            <button onClick={(e) => gonderiSil(g.id, e)} className="text-zinc-600 hover:text-red-400 transition p-1 rounded-lg">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed break-words pr-2">{g.icerik}</p>
                      
                      {/* LIKES & DISCUSSIONS FOOTER */}
                      <div className="pt-2 text-zinc-500 text-xs border-t border-zinc-900 flex items-center justify-between">
                        <button 
                          onClick={(e) => begeniAt(g.id, e, g.begenilerListesi || [])} 
                          className={`flex items-center gap-1 py-1 px-2.5 rounded-xl border transition duration-150 ${kullaniciBegenmisMi ? 'bg-red-950/30 border-red-700/40 text-red-400 font-bold' : 'bg-transparent border-transparent hover:bg-zinc-900 text-zinc-500 hover:text-red-400'}`}
                        >
                          <Heart className={`w-3.5 h-3.5 transition-transform active:scale-125 ${kullaniciBegenmisMi ? 'fill-red-500 text-red-500' : ''}`} />
                          <span>{g.begeniSayisi || 0} Beğeni</span>
                        </button>

                        <div className="flex items-center gap-1.5 group-hover:text-cyan-400 transition duration-150 text-[11px] font-medium text-zinc-600">
                          <MessageSquare className="w-3.5 h-3.5" /> <span>Tartışmaya Katıl</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        ) : (
          // DETAY VE YORUM EKRANI
          <motion.div key="detay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4 mt-4">
            <button onClick={() => setSeciliGonderi(null)} className="text-xs text-cyan-400 font-bold bg-zinc-950 border border-zinc-900 px-3 py-2 rounded-xl hover:bg-zinc-900 transition flex items-center gap-1.5"><ArrowLeft className="w-3.5 h-3.5" /> Duvara Geri Dön</button>

            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 shadow-2xl space-y-3 relative">
              <div className="flex justify-between items-center">
                <div className="text-xs font-mono text-yellow-500 font-bold">{seciliGonderi?.takma_ad}</div>
                {kullanici && seciliGonderi?.user_id === kullanici.id && (
                  <button onClick={(e) => { gonderiSil(seciliGonderi.id, e); setSeciliGonderi(null); }} className="text-zinc-600 hover:text-red-400 transition p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed break-words">{seciliGonderi?.icerik}</p>
            </div>

            {/* YORUMLAR AKIŞI */}
            <div className="space-y-2 pl-2 border-l border-zinc-900 min-h-[80px]">
              {yorumlar.length === 0 ? (
                <p className="text-xs text-zinc-600 italic p-2">Henüz yorum yok, ilk maskeli yorumu sen bırak...</p>
              ) : (
                yorumlar.map((y, idx) => (
                  <motion.div key={y.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(idx * 0.03, 0.15) }} className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-3 text-xs space-y-1 shadow-md relative group">
                    <div className="flex justify-between items-center">
                      <div className="font-mono text-cyan-400 font-bold flex items-center gap-1.5">
                        {y.takma_ad}
                        {y.takma_ad === seciliGonderi?.takma_ad && <span className="text-[8px] bg-yellow-400 text-black font-mono font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Yazar</span>}
                      </div>
                      {kullanici && y.user_id === kullanici.id && (
                        <button onClick={() => yorumSil(y.id)} className="text-zinc-700 hover:text-red-400 transition p-1 rounded">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-zinc-300 leading-relaxed break-words pr-1">{y.icerik}</p>
                  </motion.div>
                ))
              )}
            </div>

            {/* YORUM GİRİŞ ALANI */}
            <div className="flex gap-2 items-center bg-zinc-950 border border-zinc-900 p-1.5 rounded-xl shadow-2xl sticky bottom-2">
              <input type="text" value={yeniYorum} onChange={(e) => setYeniYorum(e.target.value)} placeholder="Maskeni bozmadan bir yorum bırak..." className="flex-1 bg-transparent text-xs p-2 text-zinc-200 focus:outline-none placeholder:text-zinc-700" onKeyDown={(e) => e.key === 'Enter' && yorumFirlat()}/>
              <button onClick={yorumFirlat} className="bg-cyan-400 text-black p-2 rounded-lg hover:bg-cyan-500 transition active:scale-95"><Send className="w-3.5 h-3.5" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}