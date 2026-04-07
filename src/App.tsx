import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Upload from './pages/Upload';
import Dashboard from './pages/Dashboard';
import { classifyComments } from './services/geminiService';
import type { ClassifiedComment } from './services/geminiService';
import { supabase } from './lib/supabase';

type Screen = 'login' | 'upload' | 'processing' | 'dashboard';

function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [dashboardData, setDashboardData] = useState<ClassifiedComment[]>([]);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [processingStatus, setProcessingStatus] = useState('');
  const [session, setSession] = useState<any>(null);

  // Monitorar sessão do Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadExistingData();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setScreen('upload');
        loadExistingData();
      } else {
        setScreen('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadExistingData = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      // Mapear campos do banco para o formato da interface
      const mappedData: ClassifiedComment[] = data.map((item: any, index: number) => ({
        id: index + 1,
        procedimento_codigo: item.procedimento_codigo || '',
        procedimento_nome: item.procedimento_nome || '',
        tipo: item.tipo || '',
        versao: item.versao || '',
        autor: item.autor || '',
        empresa_autor: item.empresa_autor || '',
        data: item.data_comentario || '',
        comentario: item.comentario || '',
        texto_marcado: item.texto_marcado || '',
        classificacao: item.classificacao || '',
        categoria: item.categoria || '',
        subcategoria: item.subcategoria || '',
        processo_vinculado: item.processo_vinculado || '',
        criticidade: item.criticidade || '',
        status: item.status || 'Aberto',
        pagina: '',
        id_sistema: ''
      }));
      setDashboardData(mappedData);
      setScreen('dashboard');
    }
  };

  const handleLogin = () => setScreen('upload');
  
  const handleDataLoaded = async (rawData: any[]) => {
    if (rawData.length === 0) return;

    setScreen('processing');
    setProcessingStatus('Analisando e salvando dados no Supabase...');

    try {
      const classified = await classifyComments(rawData, (current, total) => {
        setProcessingProgress({ current, total });
        setProcessingStatus(`Classificando... Lote ${current} de ${total}`);
      });

      // Salvar no Supabase
      const toSave = classified.map(c => ({
        procedimento_codigo: c.procedimento_codigo,
        procedimento_nome: c.procedimento_nome,
        tipo: c.tipo,
        versao: c.versao,
        autor: c.autor,
        empresa_autor: c.empresa_autor,
        data_comentario: c.data,
        comentario: c.comentario,
        texto_marcado: c.texto_marcado,
        classificacao: c.classificacao,
        categoria: c.categoria,
        subcategoria: c.subcategoria,
        processo_vinculado: c.processo_vinculado,
        criticidade: c.criticidade,
        status: c.status
      }));

      const { error } = await supabase.from('comments').insert(toSave);
      if (error) throw error;

      setDashboardData(classified);
      setProcessingStatus('Dados salvos permanentemente!');
      
      setTimeout(() => setScreen('dashboard'), 800);
    } catch (error) {
      console.error('Erro no processamento/salvamento:', error);
      setProcessingStatus('Erro ao salvar no banco de dados.');
    }
  };

  const handleBack = () => setScreen('upload');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setDashboardData([]);
    setScreen('login');
  };

  return (
    <div className="min-h-screen bg-linha-uni-blue">
      {!session && <Login onLogin={handleLogin} />}
      
      {session && (
        <>
          {screen === 'upload' && <Upload onDataLoaded={handleDataLoaded} />}
          
          {screen === 'processing' && (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
              <div className="w-24 h-24 border-4 border-t-linha-uni-orange border-white/10 rounded-full animate-spin mb-8"></div>
              <h2 className="text-2xl font-bold text-white mb-3">Máquina de Insights</h2>
              <p className="text-gray-400 text-lg mb-8">{processingStatus}</p>
              
              {processingProgress.total > 0 && (
                <div className="w-full max-w-md">
                  <div className="bg-white/10 rounded-full h-3 overflow-hidden mb-3">
                    <div 
                      className="h-full bg-linha-uni-orange rounded-full transition-all duration-500"
                      style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-gray-500 text-sm">
                    {processingProgress.current} / {processingProgress.total} lotes
                  </p>
                </div>
              )}
            </div>
          )}

          {screen === 'dashboard' && (
            <Dashboard data={dashboardData} onLogout={handleLogout} onBack={handleBack} />
          )}
        </>
      )}
    </div>
  );
}

export default App;
