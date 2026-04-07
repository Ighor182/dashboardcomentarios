import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import logoColor from '../assets/logo-color.png';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        onLogin();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err.message === 'Invalid login credentials' 
        ? 'E-mail ou senha incorretos.' 
        : 'Erro ao tentar logar. Verifique sua conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-linha-uni-blue">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-10">
          <div className="mb-6 group">
            <img 
              src={logoColor} 
              alt="Linha Uni" 
              className="h-16 md:h-20 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform duration-500" 
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Login do Sistema</h1>
          <p className="text-linha-uni-gray text-center font-medium">Dashboard de Procedimentos Operacionais</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0" />
              <p className="text-red-200 text-sm font-medium">{errorMsg}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300 ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                required
                disabled={isLoading}
                className="w-full glass-input rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-linha-uni-orange/50 transition-all disabled:opacity-50"
                placeholder="nome@linhauni.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300 ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                required
                disabled={isLoading}
                className="w-full glass-input rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-linha-uni-orange/50 transition-all disabled:opacity-50"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-linha-uni-orange hover:bg-linha-uni-orange-hover text-white font-bold py-4 rounded-xl flex items-center justify-center group transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Acessar Sistema
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            Esqueceu sua senha? <a href="#" className="text-linha-uni-orange hover:underline">Contate o suporte</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
