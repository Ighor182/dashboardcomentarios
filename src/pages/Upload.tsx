import React, { useState } from 'react';
import { Upload as UploadIcon, X, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import logoColor from '../assets/logo-color.png';

interface UploadProps {
  onDataLoaded: (data: any[]) => void;
}

const Upload: React.FC<UploadProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setError('Por favor, envie um arquivo Excel (.xlsx, .xls) ou CSV.');
      return;
    }

    setFile(file);
    setError(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(sheet);
        
        setTimeout(() => {
          onDataLoaded(parsedData);
          setLoading(false);
        }, 1500); // Aesthetic delay
      } catch (err) {
        setError('Erro ao processar o arquivo. Verifique se o formato está correto.');
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-linha-uni-blue">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10 animate-in slide-in-from-top-4 duration-700 font-sans">
          <div className="flex justify-center mb-8">
            <img src={logoColor} alt="Linha Uni" className="h-16 md:h-24 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Gerador de Dashboard</h2>
          <p className="text-linha-uni-gray text-lg font-medium">Faça o upload da sua planilha de procedimentos para começar a mágica.</p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative group cursor-pointer
            glass-card rounded-3xl p-12
            border-2 border-dashed transition-all duration-300
            ${isDragging ? 'border-linha-uni-orange bg-white/10 scale-[1.02]' : 'border-white/20 hover:border-white/40'}
            ${file ? 'border-green-500/50 bg-green-500/5' : ''}
          `}
        >
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileInput}
            accept=".xlsx, .xls, .csv"
          />

          <div className="flex flex-col items-center">
            {loading ? (
              <div className="flex flex-col items-center animate-pulse">
                <div className="w-20 h-20 border-4 border-t-linha-uni-orange border-white/10 rounded-full animate-spin mb-6"></div>
                <p className="text-white font-medium text-xl">Processando dados...</p>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <CheckCircle2 className="text-green-500 w-12 h-12" />
                </div>
                <p className="text-white font-semibold text-xl mb-2">{file.name}</p>
                <p className="text-green-400 text-sm">Arquivo pronto para visualização</p>
              </div>
            ) : (
              <>
                <div className="w-24 h-24 bg-linha-uni-orange/10 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                  <UploadIcon className="text-linha-uni-orange w-12 h-12" />
                </div>
                <h3 className="text-white text-2xl font-bold mb-3 tracking-tight">Arraste e solte seu arquivo</h3>
                <p className="text-gray-400 text-center mb-0">Ou clique para selecionar um arquivo do seu computador</p>
                <p className="text-gray-500 text-xs mt-4">Formatos suportados: .XLSX, .XLS, .CSV</p>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center text-red-500 animate-in slide-in-from-bottom-2">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="mt-8 flex justify-center animate-in fade-in duration-1000 delay-500">
          <button 
            onClick={() => onDataLoaded([])} 
            className="text-gray-400 hover:text-linha-uni-orange text-sm font-medium transition-colors flex items-center gap-2"
          >
            <TrendingUp size={16} /> Ver Dashboard com dados de exemplo
          </button>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-1000 delay-300">
          {[
            { title: 'Passo 1', desc: 'Extraia sua planilha de dados' },
            { title: 'Passo 2', desc: 'Arraste para esta área' },
            { title: 'Passo 3', desc: 'Veja os insights em tempo real' },
          ].map((step, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 border-white/5">
              <span className="text-linha-uni-orange font-bold text-xs uppercase tracking-widest">{step.title}</span>
              <p className="text-gray-300 text-sm mt-1 font-medium">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Upload;
