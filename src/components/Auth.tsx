import { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { auth } from "../services/firebase";
import { 
  Mail, 
  Lock, 
  UserPlus, 
  LogIn, 
  AlertCircle, 
  Loader2,
  Chrome
} from "lucide-react";
import { Button } from "./Button";
import { Input } from "./Input";

interface AuthProps {
  onSuccess: () => void;
}

export function Auth({ onSuccess }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    
    setError("");
    setLoading(true);
    
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setError("");
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onSuccess();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError(err.message || "An error occurred during Google sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-200">
              <LogIn className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-zinc-900 text-center mb-2">
            {isSignUp ? "Create an Account" : "Welcome Back"}
          </h2>
          <p className="text-zinc-500 text-center mb-8 text-sm">
            {isSignUp 
              ? "Sign up to sync your data across devices" 
              : "Sign in to access your saved invoices and data"}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 font-medium leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full py-4 rounded-2xl text-base font-bold shadow-lg shadow-brand-100"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              ) : (
                isSignUp ? "Create Account" : "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-zinc-400 font-bold tracking-widest">Or continue with</span>
            </div>
          </div>

          <div className="mt-6">
            <Button 
              variant="outline" 
              onClick={handleGoogleSignIn}
              className="w-full py-4 rounded-2xl border-zinc-200 hover:bg-zinc-50 transition-all flex items-center justify-center gap-3"
              disabled={loading}
            >
              <Chrome className="h-5 w-5 text-zinc-600" />
              <span className="font-bold text-zinc-700">Google</span>
            </Button>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors"
            >
              {isSignUp 
                ? "Already have an account? Sign In" 
                : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
        
        <div className="bg-zinc-50 p-6 border-t border-zinc-100">
          <p className="text-[10px] text-zinc-400 text-center leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy. 
            Your data is encrypted and stored securely in the cloud.
          </p>
        </div>
      </div>
    </div>
  );
}
