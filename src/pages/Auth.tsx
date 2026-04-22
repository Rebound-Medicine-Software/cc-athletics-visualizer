
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, EyeOff, Shield, Mail, Lock, User, RefreshCw, CheckCircle, UserCheck, Heart, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Phases: 0=logo animating in, 1=logo pulsing/loading, 2=transitioning, 3=auth visible
type LoadPhase = 0 | 1 | 2 | 3;

const NexusHubSVG = () => (
  <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <g fill="white">
      <path className="nh-stripe nh-s19" d="M91.328,61.843c-0.065-0.408-0.3-0.643-0.605-0.87c-3.865-2.872-7.729-5.747-11.586-8.632c-0.346-0.258-0.71-0.45-1.108-0.606c-11.314-4.42-22.629-8.839-33.937-13.275c-6.89-2.703-13.747-5.496-20.936-7.349c-0.305-0.078-0.594-0.163-0.912-0.137c-3.251,0.258-6.503,0.509-9.753,0.771c-0.249,0.02-0.514-0.008-0.79,0.166c-0.124,0.637-0.515,1.241-0.527,2.002c0.34,0,0.623-0.002,0.905,0c3.546,0.038,7.093,0.087,10.64,0.105c0.781,0.004,1.503,0.166,2.225,0.446c17.408,6.755,34.814,13.513,52.234,20.236c1.782,0.688,3.438,1.539,5.005,2.631c2.947,2.056,5.947,4.035,8.971,6.076C91.51,62.866,91.494,62.866,91.328,61.843z"/>
      <path className="nh-stripe nh-s18" d="M89.737,64.521c-2.25-1.363-4.5-2.727-6.758-4.078c-0.871-0.522-1.696-1.129-2.654-1.497C61.497,51.709,42.667,44.474,23.84,37.23c-0.431-0.166-0.863-0.256-1.317-0.302c-2.624-0.261-5.247-0.53-7.87-0.794c-1.379-0.139-2.759-0.271-4.161-0.41c-0.218,0.666-0.536,1.256-0.558,1.957c3.109,0.598,6.168,1.167,9.218,1.78c1.385,0.279,2.811,0.397,4.141,0.904c17.923,6.838,35.844,13.682,53.764,20.531c1.794,0.686,3.639,1.255,5.359,2.11c2,0.994,3.949,2.087,5.926,3.127c0.218,0.115,0.411,0.312,0.747,0.271c0.352-0.497,0.723-1.021,1.072-1.515C90.054,64.654,89.877,64.605,89.737,64.521z"/>
      <path className="nh-stripe nh-s17" d="M29.206,45.674c-2.457-0.93-4.891-1.933-7.385-2.747c-2.711-0.885-5.48-1.59-8.225-2.37c-1.294-0.367-2.59-0.726-3.955-1.108c0,0.709,0,1.327,0,2.075c25.541,9.607,51.075,19.211,76.65,28.831c0.513-0.727,0.991-1.404,1.513-2.146c-1.816-0.805-3.512-1.651-5.274-2.322C64.761,59.133,46.982,52.405,29.206,45.674z"/>
      <path className="nh-stripe nh-s16" d="M12.992,29.723c2.236-0.365,4.47-0.745,6.707-1.103c1.025-0.165,2.021-0.374,3.094-0.044c3.404,1.045,6.837,1.994,10.258,2.988c2.388,0.693,4.833,1.216,7.149,2.123c12.232,4.791,24.448,9.625,36.67,14.44c0.345,0.136,0.672,0.283,0.964,0.521c3.735,3.046,7.47,6.092,11.217,9.123c0.562,0.454,1.071,0.988,1.769,1.336c0.081-0.518-0.147-0.945-0.147-1.396c0-0.524-0.259-0.882-0.647-1.222c-4.425-3.859-8.841-7.729-13.25-11.608c-0.349-0.306-0.724-0.521-1.15-0.69c-7.722-3.061-15.44-6.13-23.16-9.194c-1.943-0.771-3.847-1.688-5.847-2.255c-8.404-2.383-16.838-4.656-25.259-6.979c-0.399-0.11-0.768-0.108-1.165-0.004c-1.067,0.28-2.143,0.526-3.213,0.794c-1.284,0.322-2.566,0.655-3.847,0.982c-0.238,0.747-0.459,1.44-0.675,2.118C12.656,29.803,12.832,29.75,12.992,29.723z"/>
      <path className="nh-stripe nh-s15" d="M27.979,51.37c-2.671-0.999-5.394-1.87-7.98-3.082c-3.275-1.535-6.533-3.107-9.803-4.652c-0.208-0.098-0.405-0.332-0.719-0.161c0,0.61,0,1.231,0,1.885c0.101,0.067,0.211,0.151,0.331,0.219c3.434,1.973,6.866,3.947,10.304,5.91c0.316,0.181,0.664,0.31,1.007,0.438c9.535,3.536,19.071,7.069,28.607,10.602c10.648,3.944,21.297,7.887,31.99,11.846c0.892-0.593,1.798-1.195,2.827-1.88c-0.401-0.154-0.653-0.254-0.907-0.349C65.082,65.223,46.527,58.307,27.979,51.37z"/>
      <path className="nh-stripe nh-s14" d="M78.614,75.919c-2.784-1.021-5.568-2.044-8.352-3.067C53.745,66.779,37.229,60.707,20.71,54.64c-0.509-0.187-0.979-0.424-1.428-0.727c-3.05-2.059-6.107-4.106-9.164-6.155c-0.227-0.152-0.429-0.356-0.78-0.42c0,0.676,0,1.316,0,2.048c3.243,2.512,6.49,5.026,9.737,7.542c0.272,0.211,0.581,0.336,0.903,0.454C35.316,62.977,50.651,68.58,65.987,74.18c3.446,1.258,6.895,2.511,10.349,3.768c0.88-0.615,1.804-1.127,2.603-1.795C78.836,75.97,78.719,75.958,78.614,75.919z"/>
      <path className="nh-stripe nh-s13" d="M20.736,23.517c9.567,2.537,19.139,5.056,28.703,7.6c1.939,0.516,3.923,0.885,5.793,1.629c6.357,2.526,12.704,5.076,19.058,7.609c0.508,0.204,0.949,0.476,1.35,0.854c4.603,4.344,9.214,8.68,13.828,13.012c0.198,0.187,0.354,0.446,0.724,0.524c-0.138-1.081-0.22-2.043-1.098-2.904c-4.62-4.532-9.185-9.122-13.723-13.735c-1.017-1.032-2.116-1.803-3.479-2.314c-4.757-1.783-9.37-3.901-14.353-5.119c-12.611-3.08-25.172-6.359-37.755-9.554c-0.294-0.075-0.592-0.168-0.912-0.031c-1.401,0.598-2.808,1.182-4.208,1.769c-0.263,0.807-0.512,1.576-0.809,2.489c1.918-0.634,3.67-1.188,5.402-1.799C19.772,23.367,20.228,23.382,20.736,23.517z"/>
      <path className="nh-stripe nh-s12" d="M19.486,59.956c-0.382-0.138-0.708-0.321-1.011-0.589c-2.81-2.473-5.627-4.938-8.446-7.4c-0.242-0.211-0.47-0.457-0.862-0.608c0,0.731,0,1.376,0,2.082c2.832,2.775,5.713,5.591,8.579,8.422c0.434,0.429,0.91,0.724,1.486,0.931c14.939,5.364,29.874,10.741,44.811,16.115c2.336,0.84,4.675,1.674,7.04,2.52c0.86-0.569,1.705-1.128,2.705-1.787c-1.158-0.425-2.156-0.794-3.155-1.157C53.584,72.305,36.537,66.127,19.486,59.956z"/>
      <path className="nh-stripe nh-s11" d="M19.002,19.112c2.963,0.74,5.936,1.443,8.903,2.168c12.007,2.932,24.016,5.854,36.018,8.811c2.684,0.661,5.434,1.103,7.979,2.27c0.448,0.206,0.822,0.458,1.158,0.816c4.257,4.528,8.521,9.05,12.784,13.571c1.184,1.254,2.37,2.505,3.555,3.757c-0.046-0.929,0.059-1.835-0.623-2.593c-5.316-5.904-10.61-11.828-15.9-17.754c-0.264-0.295-0.563-0.454-0.929-0.539c-6.804-1.594-13.605-3.187-20.408-4.784c-10.795-2.534-21.593-5.058-32.38-7.627c-1.014-0.242-1.869-0.223-2.678,0.441c-0.043,0.035-0.087,0.071-0.172,0.142c-0.257,0.809-0.528,1.659-0.849,2.668c0.936-0.465,1.719-0.843,2.489-1.245C18.298,19.032,18.612,19.014,19.002,19.112z"/>
      <path className="nh-stripe nh-s10" d="M67.779,82.776C51.37,76.908,34.957,71.05,18.543,65.195c-0.411-0.146-0.75-0.354-1.046-0.678c-2.395-2.616-4.8-5.221-7.203-7.829c-0.375-0.406-0.75-0.813-1.27-1.376c0,0.887,0,1.553,0,2.3c2.635,3.149,5.332,6.362,8.01,9.59c0.314,0.378,0.712,0.533,1.139,0.685c13.524,4.793,27.049,9.586,40.573,14.38c2.393,0.849,4.785,1.701,7.215,2.563c0.847-0.562,1.683-1.118,2.523-1.676C68.293,82.852,68.005,82.857,67.779,82.776z"/>
      <path className="nh-stripe nh-s9" d="M17.64,70.274c-0.469-0.166-0.837-0.414-1.142-0.818c-1.553-2.06-3.126-4.104-4.695-6.15c-0.926-1.207-1.857-2.41-2.786-3.615c-0.048,0.013-0.097,0.024-0.146,0.037c0,0.667,0,1.334,0,2.131c2.298,3.262,4.686,6.637,7.054,10.027c0.341,0.488,0.75,0.776,1.316,0.974c12.434,4.337,24.861,8.693,37.291,13.044c2.154,0.755,4.313,1.496,6.453,2.237c0.839-0.558,1.633-1.087,2.556-1.701c-0.373-0.139-0.584-0.22-0.797-0.295C47.709,80.853,32.676,75.561,17.64,70.274z"/>
      <path className="nh-stripe nh-s8" d="M43.208,21.058c9.712,2.196,19.422,4.403,29.136,6.589c0.416,0.093,0.705,0.264,0.978,0.583c4.925,5.789,9.859,11.569,14.795,17.35c0.222,0.26,0.416,0.559,0.762,0.737c-0.052-1.182-0.361-2.146-1.119-3.062c-4.433-5.348-8.824-10.729-13.165-16.151c-0.812-1.015-1.663-1.704-2.977-1.794c-0.446-0.031-0.881-0.201-1.323-0.296c-8.212-1.781-16.425-3.556-24.636-5.343c-8.21-1.788-16.417-3.59-24.629-5.373c-0.264-0.057-0.531-0.197-0.827-0.092c-0.874,0.31-1.751,0.608-2.779,0.963c0.343,0.114,0.519,0.189,0.702,0.23C26.486,17.288,34.849,19.167,43.208,21.058z"/>
      <path className="nh-stripe nh-s7" d="M23.34,13.343c4.653,0.978,9.308,1.95,13.961,2.926c11.882,2.493,23.764,4.994,35.651,7.462c0.645,0.134,1.049,0.426,1.435,0.92c4.477,5.747,8.971,11.481,13.462,17.218c0.099,0.126,0.158,0.318,0.433,0.266c-0.229-0.769-0.086-1.598-0.632-2.319c-4.362-5.761-8.7-11.541-13.04-17.318c-0.25-0.333-0.533-0.516-0.964-0.602c-3.526-0.696-7.045-1.434-10.568-2.146c-12.263-2.479-24.528-4.952-36.792-7.43c-0.194-0.04-0.379-0.121-0.581-0.049c-0.834,0.298-1.669,0.595-2.535,0.903C23.266,13.273,23.298,13.334,23.34,13.343z"/>
      <path className="nh-stripe nh-s6" d="M16.89,75.22c-0.614-0.212-1.049-0.534-1.41-1.098c-1.984-3.1-4.012-6.171-6.031-9.248c-0.198-0.302-0.341-0.648-0.772-0.97c0.019,0.853-0.297,1.627,0.036,2.235c0.76,1.386,1.495,2.812,2.501,4.035c1.369,1.664,2.847,3.238,4.272,4.856c0.266,0.303,0.569,0.539,0.924,0.732c2.981,1.62,5.957,3.252,8.932,4.883c0.398,0.218,0.81,0.397,1.24,0.546c7.827,2.698,15.652,5.405,23.478,8.107c2.025,0.699,4.051,1.392,6.066,2.083c0.791-0.596,1.641-1.022,2.394-1.682c-0.156-0.075-0.227-0.118-0.303-0.144C44.443,84.774,30.668,79.991,16.89,75.22z"/>
      <path className="nh-stripe nh-s5" d="M87.462,38.137c0.066-0.028,0.134-0.056,0.201-0.084c-0.209-0.743-0.124-1.53-0.622-2.236c-3.904-5.526-7.785-11.069-11.66-16.617c-0.284-0.405-0.619-0.591-1.099-0.68c-4.092-0.754-8.179-1.533-12.267-2.302c-4.673-0.879-9.347-1.754-14.019-2.634c-5.256-0.99-10.514-1.978-15.768-2.977c-1.143-0.217-2.548,0.07-3.64,0.815c15.381,3.002,30.728,5.999,45.997,8.98C78.92,26.373,83.19,32.255,87.462,38.137z"/>
      <path className="nh-stripe nh-s4" d="M86.933,34.299c-0.021-1.345-0.588-2.471-1.256-3.501c-3.201-4.942-6.465-9.843-9.694-14.767c-0.226-0.344-0.506-0.492-0.891-0.559c-5.302-0.917-10.604-1.832-15.902-2.765c-7.279-1.28-14.562-2.543-21.83-3.89c-1.373-0.255-2.45,0.274-3.61,0.812c13.836,2.518,27.671,5.035,41.549,7.56C79.168,22.881,83.051,28.59,86.933,34.299z"/>
      <path className="nh-stripe nh-s3" d="M82.534,24.493c0.061-0.038,0.12-0.075,0.181-0.113c-1.476-4.22-4.093-7.814-6.41-11.618c-4.295-0.698-8.599-1.39-12.9-2.098c-7.097-1.168-14.197-2.319-21.283-3.546c-1.306-0.226-2.338,0.261-3.44,0.797c12.434,2.112,24.869,4.225,37.275,6.333C78.166,17.69,80.351,21.092,82.534,24.493z"/>
      <path className="nh-stripe nh-s2" d="M76.639,11.108c-0.064-0.02-0.142-0.051-0.223-0.066C71.225,10.03,66.032,9.019,60.84,8.011c-4.5-0.874-9.005-1.714-13.535-2.425c-1.409-0.221-2.679-0.089-4.054,0.661C54.494,8.033,65.61,9.8,76.733,11.567C76.786,11.425,76.78,11.265,76.639,11.108z"/>
      <path className="nh-stripe nh-s1" d="M53.289,92.726c-4.462-1.532-8.927-3.056-13.386-4.596c-0.309-0.106-0.601-0.139-1.029-0.089c3.508,1.916,6.904,3.764,10.291,5.626c0.7,0.386,1.438,0.641,2.225,0.845c0.771-0.518,1.534-1.029,2.291-1.536C53.57,92.754,53.411,92.768,53.289,92.726z"/>
    </g>
  </svg>
);

const LOADING_STYLES = `
  @font-face {
    font-family: "Circular";
    src: url("https://s3.amazonaws.com/cdn.looka.com/fonts/circular/lineto-circular-bold.woff2") format("woff2"),
         url("https://s3.amazonaws.com/cdn.looka.com/fonts/circular/lineto-circular-bold.woff") format("woff");
    font-weight: bold;
    font-style: normal;
  }

  @keyframes nh-pulse {
    0%, 100% { filter: drop-shadow(0 0 0px rgba(255,255,255,0)); }
    50%       { filter: drop-shadow(0 0 20px rgba(255,255,255,0.5)); }
  }

  @keyframes nh-activate {
    0%   { opacity: 0; transform: translateY(18px); filter: brightness(2.5); }
    60%  { opacity: 1; filter: brightness(3); }
    100% { opacity: 1; transform: translateY(0); filter: brightness(1); }
  }

  @keyframes nh-titleIn {
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes nh-fadeIn {
    to { opacity: 1; }
  }

  @keyframes nh-load {
    to { width: 100%; }
  }

  .nh-stripe {
    fill: white;
    opacity: 0;
    transform: translateY(18px);
    animation: nh-activate 0.55s forwards;
  }

  .nh-s1  { animation-delay: 0.05s }
  .nh-s2  { animation-delay: 0.12s }
  .nh-s3  { animation-delay: 0.19s }
  .nh-s4  { animation-delay: 0.26s }
  .nh-s5  { animation-delay: 0.33s }
  .nh-s6  { animation-delay: 0.40s }
  .nh-s7  { animation-delay: 0.47s }
  .nh-s8  { animation-delay: 0.54s }
  .nh-s9  { animation-delay: 0.61s }
  .nh-s10 { animation-delay: 0.68s }
  .nh-s11 { animation-delay: 0.75s }
  .nh-s12 { animation-delay: 0.82s }
  .nh-s13 { animation-delay: 0.89s }
  .nh-s14 { animation-delay: 0.96s }
  .nh-s15 { animation-delay: 1.03s }
  .nh-s16 { animation-delay: 1.10s }
  .nh-s17 { animation-delay: 1.17s }
  .nh-s18 { animation-delay: 1.24s }
  .nh-s19 { animation-delay: 1.31s }
`;

const Auth = () => {
  const navigate = useNavigate();
  const [loadPhase, setLoadPhase] = useState<LoadPhase>(0);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState<'clinician' | 'client' | null>(null);
  const [showForgotModal, setShowForgotModal] = useState<'password' | 'email' | 'both' | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: ""
  });

  useEffect(() => {
    // Phase 0→1: stripes animate in (~1.5s), then pulse
    const t1 = setTimeout(() => setLoadPhase(1), 100);
    // Phase 1→2: start morphing at 8s
    const t2 = setTimeout(() => setLoadPhase(2), 8000);
    // Phase 2→3: auth fully visible at 12s (slower transition)
    const t3 = setTimeout(() => setLoadPhase(3), 12000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const isTransitioning = loadPhase >= 2;
  const isAuthVisible = loadPhase >= 3;
  const showLoadingScreen = loadPhase < 3;

  // Safe password generation
  const generateSafePassword = () => {
    const adjectives = ["Swift", "Strong", "Bright", "Noble", "Quick", "Bold", "Smart", "Great"];
    const nouns = ["Tiger", "Eagle", "Lion", "Wolf", "Bear", "Hawk", "Fox", "Shark"];
    const numbers = Math.floor(Math.random() * 99) + 10;
    const symbols = ["!", "@", "#", "$", "%"];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    return `${adjective}${noun}${numbers}${symbol}`;
  };

  const handleGeneratePassword = () => {
    const newPassword = generateSafePassword();
    setSignupData(prev => ({ ...prev, password: newPassword, confirmPassword: newPassword }));
    toast.success("Safe password generated! Consider saving this in your password manager.");
  };

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return { minLength, hasUpper, hasLower, hasNumber, hasSpecial, isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial };
  };

  const sendWelcomeEmail = async (email: string, firstName: string, lastName: string) => {
    try {
      await supabase.functions.invoke('send-welcome-email', { body: { email, firstName, lastName } });
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) { setError("Please enter your email address"); return; }
    setIsLoading(true); setError("");
    try {
      const { error } = await supabase.functions.invoke('send-password-reset', { body: { email: resetEmail } });
      if (error) { setError(error.message); return; }
      setResetMessage("Password reset email sent! Check your inbox.");
      setResetEmail(""); setShowForgotModal(null);
      toast.success("Password reset email sent!");
    } catch { setError("An unexpected error occurred"); } finally { setIsLoading(false); }
  };

  const handleEmailRecovery = async () => {
    if (!resetEmail) { setError("Please provide any alternate contact information you may have used"); return; }
    setIsLoading(true); setError("");
    try {
      const { error } = await supabase.functions.invoke('send-email-recovery', { body: { contactInfo: resetEmail, userRole } });
      if (error) { setError(error.message); return; }
      setResetMessage("Recovery request submitted! Our support team will contact you within 24 hours.");
      setResetEmail(""); setShowForgotModal(null);
      toast.success("Recovery request sent!");
    } catch { setError("An unexpected error occurred"); } finally { setIsLoading(false); }
  };

  const handleBothForgotten = async () => {
    setIsLoading(true); setError("");
    try {
      const { error } = await supabase.functions.invoke('send-account-recovery', { body: { contactInfo: resetEmail, userRole, fullRecovery: true } });
      if (error) { setError(error.message); return; }
      setResetMessage("Account recovery request submitted! Our support team will verify your identity and contact you within 48 hours.");
      setResetEmail(""); setShowForgotModal(null);
      toast.success("Account recovery request sent!");
    } catch { setError("An unexpected error occurred"); } finally { setIsLoading(false); }
  };

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) { setError("Please fill in all fields"); return; }
    setIsLoading(true); setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginData.email, password: loginData.password });
      if (error) { setError(error.message); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (!profile) { await supabase.auth.signOut(); setError("Your account profile has been removed. Please contact your organization or sign up again."); return; }
        if ((profile.role === 'practitioner' || profile.role === 'client') && !profile.created_by) { await supabase.auth.signOut(); setError("Your Organization account has been removed. Please sign up again to continue."); return; }
        const isClinicianPortal = userRole === 'clinician';
        const isPatientPortal = userRole === 'client';
        if (isClinicianPortal && !['organisation', 'practitioner', 'super_admin'].includes(profile.role)) { await supabase.auth.signOut(); setError("Access denied. Your account role does not have access to the Clinician Portal."); return; }
        if (isPatientPortal && !['client', 'super_admin'].includes(profile.role)) { await supabase.auth.signOut(); setError("Access denied. Your account role does not have access to the Athlete/Patient Portal."); return; }
        toast.success("Login successful!");
        if (profile.role === 'super_admin') { navigate('/dashboard'); }
        else if (profile.role === 'organisation') { navigate(profile.setup_completed ? '/dashboard' : '/setup'); }
        else if (profile.role === 'practitioner') { navigate('/dashboard'); }
        else if (profile.role === 'client') { navigate('/Dashboard(Client)'); }
        else { navigate('/dashboard'); }
      }
    } catch { setError("An unexpected error occurred"); } finally { setIsLoading(false); }
  };

  const handleSignup = async () => {
    if (!signupData.email || !signupData.password || !signupData.firstName || !signupData.lastName) { setError("Please fill in all fields"); return; }
    if (signupData.password !== signupData.confirmPassword) { setError("Passwords do not match"); return; }
    const passwordValidation = validatePassword(signupData.password);
    if (!passwordValidation.isValid) { setError("Password does not meet security requirements"); return; }
    setIsLoading(true); setError("");
    try {
      let role = 'client';
      if (userRole === 'clinician') role = 'organisation';
      if (signupData.email === 'reflexsportstherpayy@gmail.com') role = 'super_admin';

      if (role === 'organisation') {
        const { data, error } = await supabase.functions.invoke('signup-organisation', {
          body: { email: signupData.email, password: signupData.password, firstName: signupData.firstName, lastName: signupData.lastName }
        });
        if (error) { setError(error.message || 'Failed to create organization account'); return; }
        if (data?.error) { setError(data.error); return; }
        toast.success("Organisation account created! Please check your email for account verification instructions.");
        setTimeout(() => { const loginTab = document.querySelector('[value="login"]') as HTMLElement; if (loginTab) loginTab.click(); }, 2000);
      } else {
        const { error } = await supabase.auth.signUp({
          email: signupData.email, password: signupData.password,
          options: { emailRedirectTo: `${window.location.origin}/setup`, data: { first_name: signupData.firstName, last_name: signupData.lastName, role } }
        });
        if (error) { setError(error.message); return; }
        await sendWelcomeEmail(signupData.email, signupData.firstName, signupData.lastName);
        if (role === 'super_admin') toast.success("Super Admin account created! Full platform access granted.");
        else toast.success("Account created! Please check your email for verification from reflexsportstherapyy@gmail.com");
      }
    } catch { setError("An unexpected error occurred"); } finally { setIsLoading(false); }
  };

  const passwordValidation = validatePassword(signupData.password);

  // Render the auth card content (role selection or login/signup)
  const renderAuthContent = () => {
    if (!userRole) {
      return (
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl border-gray-200">
          <CardHeader className="text-center space-y-4">
            <CardTitle className="text-2xl font-bold text-[#1e3a6e]">
              Welcome to NEXUS HUB
            </CardTitle>
            <p className="text-sm text-gray-500">
              Please select your role to continue
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => setUserRole('clinician')} variant="outline" className="w-full h-16 flex items-center gap-4 text-left border-gray-200 bg-gray-50 text-[#1e3a6e] hover:bg-[#1e3a6e]/10 hover:border-[#1e3a6e]/40">
              <UserCheck className="w-8 h-8 text-[#1e3a6e]" />
              <div>
                <div className="font-semibold text-[#1e3a6e]">Clinician</div>
                <div className="text-sm text-gray-500">Healthcare provider or coach</div>
              </div>
            </Button>
            <Button onClick={() => setUserRole('client')} variant="outline" className="w-full h-16 flex items-center gap-4 text-left border-gray-200 bg-gray-50 text-[#1e3a6e] hover:bg-[hsl(38,92%,50%)]/10 hover:border-[hsl(38,92%,50%)]">
              <Heart className="w-8 h-8 text-[hsl(38,92%,50%)]" />
              <div>
                <div className="font-semibold text-[#1e3a6e]">Athlete/Patient</div>
                <div className="text-sm text-gray-500">Receiving treatment or training</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl border-gray-200">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-2xl font-bold text-[#1e3a6e]">
            {userRole === 'clinician' ? 'Clinician Portal' : 'Athlete/Patient Portal'}
          </CardTitle>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Shield className="w-4 h-4" />
            <span>HIPAA-compliant security with Row Level Security (RLS)</span>
          </div>
          <Button onClick={() => setUserRole(null)} variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-[#1e3a6e]">← Change role</Button>
        </CardHeader>
        <CardContent>
          {userRole === 'clinician' ? (
            <Tabs defaultValue="login" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <TabsContent value="login" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="flex items-center gap-2 text-[#1e3a6e]"><Mail className="w-4 h-4" />Email</Label>
                  <Input id="login-email" type="email" placeholder="Enter your email" className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400" value={loginData.email} onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="flex items-center gap-2 text-[#1e3a6e]"><Lock className="w-4 h-4" />Password</Label>
                  <div className="relative">
                    <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="Enter your password" className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400" value={loginData.password} onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))} />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-[#1e3a6e]" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <Button onClick={handleLogin} disabled={isLoading} className="w-full bg-[#1e3a6e] hover:bg-[#162d56] text-white">{isLoading ? "Signing in..." : "Sign In"}</Button>
                {resetMessage && <Alert><AlertDescription>{resetMessage}</AlertDescription></Alert>}
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 text-center">Need help accessing your account?</p>
                  <Dialog open={showForgotModal === 'password'} onOpenChange={(open) => !open && setShowForgotModal(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-[#1e3a6e] hover:text-[#162d56] hover:bg-[#1e3a6e]/10" onClick={() => setShowForgotModal('password')}>
                        <HelpCircle className="w-4 h-4 mr-2" />Forgotten Your Password?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Reset Your Password</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">Enter your email address and we'll send you a link to reset your password.</p>
                        <Input type="email" placeholder="Enter your email address" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                        <Button onClick={handlePasswordReset} disabled={isLoading} className="w-full">{isLoading ? "Sending..." : "Send Reset Link"}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={showForgotModal === 'email'} onOpenChange={(open) => !open && setShowForgotModal(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-[#1e3a6e] hover:text-[#162d56] hover:bg-[#1e3a6e]/10" onClick={() => setShowForgotModal('email')}>
                        <HelpCircle className="w-4 h-4 mr-2" />Forgotten Your Email?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Recover Your Email</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">Provide any alternate contact information you may have used.</p>
                        <Input placeholder="Phone number or alternate contact info" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                        <Button onClick={handleEmailRecovery} disabled={isLoading} className="w-full">{isLoading ? "Submitting..." : "Submit Recovery Request"}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={showForgotModal === 'both'} onOpenChange={(open) => !open && setShowForgotModal(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-[#1e3a6e] hover:text-[#162d56] hover:bg-[#1e3a6e]/10" onClick={() => setShowForgotModal('both')}>
                        <HelpCircle className="w-4 h-4 mr-2" />Forgotten Both?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Account Recovery</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">For security reasons, we'll need to verify your identity.</p>
                        <Input placeholder="Any contact info or account details you remember" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>• Phone number associated with the account</p>
                          <p>• Approximate date you created the account</p>
                          <p>• Name of your clinic or organization</p>
                          <p>• Any other identifying information</p>
                        </div>
                        <Button onClick={handleBothForgotten} disabled={isLoading} className="w-full">{isLoading ? "Submitting..." : "Submit Account Recovery"}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </TabsContent>
              <TabsContent value="signup" className="space-y-4">
                <div className="text-center text-sm text-gray-500 mb-4">Create Organisation Account (for first-time Clinician setup)</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name" className="flex items-center gap-2 text-[#1e3a6e]"><User className="w-4 h-4" />First Name</Label>
                    <Input id="first-name" placeholder="First name" className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400" value={signupData.firstName} onChange={(e) => setSignupData(prev => ({ ...prev, firstName: e.target.value }))} />
                  </div>
                  <div className="space-y-2 flex flex-col items-center">
                    <Label htmlFor="last-name" className="flex items-center gap-2 text-[#1e3a6e]"><User className="w-4 h-4" />Last Name</Label>
                    <Input id="last-name" placeholder="Last name" className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400" value={signupData.lastName} onChange={(e) => setSignupData(prev => ({ ...prev, lastName: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="flex items-center gap-2 text-[#1e3a6e]"><Mail className="w-4 h-4" />Email</Label>
                  <Input id="signup-email" type="email" placeholder="Enter your email" className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400" value={signupData.email} onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signup-password" className="flex items-center gap-2 text-[#1e3a6e]"><Lock className="w-4 h-4" />Password</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleGeneratePassword} className="text-xs h-6"><RefreshCw className="w-3 h-3 mr-1" />Generate Safe Password</Button>
                  </div>
                  <div className="relative">
                    <Input id="signup-password" type={showPassword ? "text" : "password"} placeholder="Create a password" className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400" value={signupData.password} onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))} />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-[#1e3a6e]" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  {signupData.password && (
                    <div className="text-xs space-y-1">
                      <div className={`flex items-center gap-2 ${passwordValidation.minLength ? 'text-green-600' : 'text-red-600'}`}><CheckCircle className="w-3 h-3" />At least 8 characters</div>
                      <div className={`flex items-center gap-2 ${passwordValidation.hasUpper ? 'text-green-600' : 'text-red-600'}`}><CheckCircle className="w-3 h-3" />One uppercase letter</div>
                      <div className={`flex items-center gap-2 ${passwordValidation.hasLower ? 'text-green-600' : 'text-red-600'}`}><CheckCircle className="w-3 h-3" />One lowercase letter</div>
                      <div className={`flex items-center gap-2 ${passwordValidation.hasNumber ? 'text-green-600' : 'text-red-600'}`}><CheckCircle className="w-3 h-3" />One number</div>
                      <div className={`flex items-center gap-2 ${passwordValidation.hasSpecial ? 'text-green-600' : 'text-red-600'}`}><CheckCircle className="w-3 h-3" />One special character</div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-[#1e3a6e]">Confirm Password</Label>
                  <div className="relative">
                    <Input id="confirm-password" type={showPassword ? "text" : "password"} placeholder="Confirm your password" className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400" value={signupData.confirmPassword} onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))} />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-[#1e3a6e]" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <Button onClick={handleSignup} disabled={isLoading || !passwordValidation.isValid} className="w-full bg-[#1e3a6e] hover:bg-[#162d56] text-white">{isLoading ? "Creating Account..." : "Create Account"}</Button>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-6">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-login-email" className="flex items-center gap-2 text-[#1e3a6e]"><Mail className="w-4 h-4" />Email</Label>
                  <Input id="client-login-email" type="email" placeholder="Enter your email" className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400" value={loginData.email} onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-login-password" className="flex items-center gap-2 text-[#1e3a6e]"><Lock className="w-4 h-4" />Password</Label>
                  <div className="relative">
                    <Input id="client-login-password" type={showPassword ? "text" : "password"} placeholder="Enter your password" className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400" value={loginData.password} onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))} />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-[#1e3a6e]" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <Button onClick={handleLogin} disabled={isLoading} className="w-full bg-[#1e3a6e] hover:bg-[#162d56] text-white">{isLoading ? "Signing in..." : "Sign In"}</Button>
                {resetMessage && <Alert><AlertDescription>{resetMessage}</AlertDescription></Alert>}
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 text-center">Need help accessing your account?</p>
                  <Dialog open={showForgotModal === 'password'} onOpenChange={(open) => !open && setShowForgotModal(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-[#1e3a6e] hover:text-[#162d56] hover:bg-[#1e3a6e]/10" onClick={() => setShowForgotModal('password')}>
                        <HelpCircle className="w-4 h-4 mr-2" />Forgotten Your Password?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Reset Your Password</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">Enter your email address and we'll send you a link to reset your password.</p>
                        <Input type="email" placeholder="Enter your email address" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                        <Button onClick={handlePasswordReset} disabled={isLoading} className="w-full">{isLoading ? "Sending..." : "Send Reset Link"}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={showForgotModal === 'email'} onOpenChange={(open) => !open && setShowForgotModal(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-[#1e3a6e] hover:text-[#162d56] hover:bg-[#1e3a6e]/10" onClick={() => setShowForgotModal('email')}>
                        <HelpCircle className="w-4 h-4 mr-2" />Forgotten Your Email?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Recover Your Email</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">Provide any alternate contact information you may have used.</p>
                        <Input placeholder="Phone number or alternate contact info" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                        <Button onClick={handleEmailRecovery} disabled={isLoading} className="w-full">{isLoading ? "Submitting..." : "Submit Recovery Request"}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={showForgotModal === 'both'} onOpenChange={(open) => !open && setShowForgotModal(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-[#1e3a6e] hover:text-[#162d56] hover:bg-[#1e3a6e]/10" onClick={() => setShowForgotModal('both')}>
                        <HelpCircle className="w-4 h-4 mr-2" />Forgotten Both?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Account Recovery</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">For security reasons, we'll need to verify your identity.</p>
                        <Input placeholder="Any contact info or account details you remember" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>• Phone number associated with the account</p>
                          <p>• Approximate date you created the account</p>
                          <p>• Name of your clinic or organization</p>
                          <p>• Any other identifying information</p>
                        </div>
                        <Button onClick={handleBothForgotten} disabled={isLoading} className="w-full">{isLoading ? "Submitting..." : "Submit Account Recovery"}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <style>{LOADING_STYLES}</style>

      {/* Background — solid navy */}
      <div
        className="absolute inset-0 transition-all duration-[4000ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          background: '#1e3a6e',
        }}
      />

      {/* Loading overlay with logo, title, subtitle, progress */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-all duration-[4000ms] ease-[cubic-bezier(0.4,0,0.2,1)] z-10"
        style={{
          opacity: isTransitioning ? 0 : 1,
          transform: isTransitioning ? 'scale(0.85) translateY(-40px)' : 'scale(1) translateY(0)',
          pointerEvents: isTransitioning ? 'none' : 'auto',
        }}
      >
        <div className="text-center p-8 w-full" style={{ fontFamily: "Circular, Arial, sans-serif" }}>
          {/* Logo — large centered */}
          <div
            className="mx-auto mb-5 transition-all duration-[2000ms]"
            style={{
              width: 260,
              animation: loadPhase >= 1 ? 'nh-pulse 2.4s ease-in-out infinite' : 'none',
            }}
          >
            <NexusHubSVG />
          </div>

          {/* Title */}
          <div
            style={{
              fontFamily: "Circular, Arial, sans-serif",
              fontSize: 72,
              fontWeight: 'bold',
              letterSpacing: 4,
              lineHeight: 1,
              margin: '0 0 12px',
              opacity: 0,
              transform: 'scale(0.92)',
              animation: 'nh-titleIn 0.9s cubic-bezier(.22,.68,0,1.1) forwards',
              animationDelay: '1.9s',
              color: '#ffffff',
            }}
          >
            NEXUSHUB
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontFamily: "Circular, Arial, sans-serif",
              fontSize: 11,
              letterSpacing: 6,
              textTransform: 'uppercase' as const,
              color: 'rgba(255,255,255,0.75)',
              opacity: 0,
              margin: '0 0 24px',
              animation: 'nh-fadeIn 1s forwards',
              animationDelay: '2.4s',
            }}
          >
            O N E &nbsp; H U B . &nbsp; A L L &nbsp; D A T A . &nbsp; M A D E &nbsp; S I M P L E
          </div>

          {/* Progress bar */}
          <div style={{ width: 220, height: 3, background: 'rgba(255,255,255,0.15)', margin: '20px auto 0', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: 0, background: '#ffffff', borderRadius: 2, animation: 'nh-load 7.5s linear forwards' }} />
          </div>
        </div>
      </div>

      {/* Small logo that persists above the auth card */}
      <div
        className="absolute left-1/2 transition-all duration-[4000ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] z-20"
        style={{
          transform: isTransitioning
            ? 'translate(-50%, 0) scale(1)'
            : 'translate(-50%, 0) scale(0)',
          top: isTransitioning ? 'calc(50% - 240px)' : '50%',
          opacity: isTransitioning ? 1 : 0,
          width: 56,
          height: 56,
        }}
      >
        <div className="w-14 h-14 rounded-full bg-[#1e3a6e] p-2 shadow-lg">
          <NexusHubSVG />
        </div>
      </div>

      {/* Auth content — slides up from below */}
      <div
        className="relative z-20 min-h-screen flex items-center justify-center p-4 transition-all duration-[4000ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
        style={{
          opacity: isTransitioning ? 1 : 0,
          transform: isTransitioning ? 'translateY(0)' : 'translateY(60px)',
          pointerEvents: isAuthVisible ? 'auto' : 'none',
        }}
      >
        {renderAuthContent()}
      </div>
    </div>
  );
};

export default Auth;
