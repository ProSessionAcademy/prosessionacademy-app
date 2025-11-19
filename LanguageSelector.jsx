import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

const translations = {
  en: {
    // Navigation
    dashboard: "Dashboard",
    courses: "Courses",
    pathways: "Learning Pathways",
    studentSpace: "Student Space",
    community: "Community",
    meetingRooms: "Meeting Rooms",
    events: "Events",
    companies: "Companies",
    voting: "Voting",
    resources: "Resources",
    courseRequest: "Course Request",
    aiAssistant: "AI Assistant",
    
    // Subscription
    premium: "Premium",
    freeTrial: "Free Trial",
    standard: "Standard",
    mySubscription: "My Subscription",
    viewPlans: "View plans & upgrade",
    logout: "Logout",
    
    // Auth
    loginToStart: "Login to Start",
    signIn: "Sign In",
    loginToContinue: "Login to continue",
    
    // Common
    upgrade: "Upgrade",
    upgradeNow: "Upgrade Now",
    takeTes: "Take Test",
    browseCourses: "Browse Courses",
    contineLearning: "Continue Learning",
    viewAll: "View All",
    startCourse: "Start Course",
    
    // Dashboard
    welcomeBack: "Welcome back",
    transformCareer: "Transform Your Career Today",
    professionalDev: "Professional Development Platform",
    activeCourses: "Active Courses",
    completed: "Completed",
    availableCourses: "Available Courses",
    upcomingEvents: "Upcoming Events",
    
    // Subscription messages
    trialActive: "Free trial active! {days} days left to discover all features",
    upgradePremium: "Upgrade to Premium for €2.99/month and get unlimited access!",
    
    // Language names
    english: "English",
    dutch: "Nederlands",
    french: "Français",
  },
  nl: {
    // Navigation
    dashboard: "Dashboard",
    courses: "Cursussen",
    pathways: "Leerpaden",
    studentSpace: "Student Ruimte",
    community: "Community",
    meetingRooms: "Meeting Kamers",
    events: "Evenementen",
    companies: "Bedrijven",
    voting: "Stemmen",
    resources: "Bronnen",
    courseRequest: "Cursus Aanvraag",
    aiAssistant: "AI Assistent",
    
    // Subscription
    premium: "Premium",
    freeTrial: "Gratis Proef",
    standard: "Standaard",
    mySubscription: "Mijn Abonnement",
    viewPlans: "Bekijk plannen & upgrade",
    logout: "Uitloggen",
    
    // Auth
    loginToStart: "Inloggen om te Beginnen",
    signIn: "Inloggen",
    loginToContinue: "Login om door te gaan",
    
    // Common
    upgrade: "Upgraden",
    upgradeNow: "Upgrade Nu",
    takeTest: "Test Maken",
    browseCourses: "Bladeren Cursussen",
    continueLearning: "Doorgaan met Leren",
    viewAll: "Alles Bekijken",
    startCourse: "Start Cursus",
    
    // Dashboard
    welcomeBack: "Welkom terug",
    transformCareer: "Transformeer Vandaag Je Carrière",
    professionalDev: "Professionele Ontwikkeling Platform",
    activeCourses: "Actieve Cursussen",
    completed: "Voltooid",
    availableCourses: "Beschikbare Cursussen",
    upcomingEvents: "Aankomende Evenementen",
    
    // Subscription messages
    trialActive: "Gratis proefperiode actief! Nog {days} dagen om alle functies te ontdekken",
    upgradePremium: "Upgrade naar Premium voor €2.99/maand en krijg onbeperkte toegang!",
    
    // Language names
    english: "English",
    dutch: "Nederlands",
    french: "Français",
  },
  fr: {
    // Navigation
    dashboard: "Tableau de Bord",
    courses: "Cours",
    pathways: "Parcours d'Apprentissage",
    studentSpace: "Espace Étudiant",
    community: "Communauté",
    meetingRooms: "Salles de Réunion",
    events: "Événements",
    companies: "Entreprises",
    voting: "Vote",
    resources: "Ressources",
    courseRequest: "Demande de Cours",
    aiAssistant: "Assistant IA",
    
    // Subscription
    premium: "Premium",
    freeTrial: "Essai Gratuit",
    standard: "Standard",
    mySubscription: "Mon Abonnement",
    viewPlans: "Voir les plans & mettre à niveau",
    logout: "Déconnexion",
    
    // Auth
    loginToStart: "Connectez-vous pour Commencer",
    signIn: "Se Connecter",
    loginToContinue: "Connectez-vous pour continuer",
    
    // Common
    upgrade: "Mettre à Niveau",
    upgradeNow: "Mettre à Niveau Maintenant",
    takeTest: "Passer le Test",
    browseCourses: "Parcourir les Cours",
    continueLearning: "Continuer l'Apprentissage",
    viewAll: "Voir Tout",
    startCourse: "Commencer le Cours",
    
    // Dashboard
    welcomeBack: "Bon retour",
    transformCareer: "Transformez Votre Carrière Aujourd'hui",
    professionalDev: "Plateforme de Développement Professionnel",
    activeCourses: "Cours Actifs",
    completed: "Terminé",
    availableCourses: "Cours Disponibles",
    upcomingEvents: "Événements à Venir",
    
    // Subscription messages
    trialActive: "Essai gratuit actif! {days} jours restants pour découvrir toutes les fonctionnalités",
    upgradePremium: "Passez à Premium pour 2,99 €/mois et obtenez un accès illimité!",
    
    // Language names
    english: "English",
    dutch: "Nederlands",
    french: "Français",
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('language');
    if (saved && translations[saved]) {
      setLanguage(saved);
    }
  }, []);

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key, replacements = {}) => {
    let text = translations[language]?.[key] || translations['en'][key] || key;
    
    Object.keys(replacements).forEach(replaceKey => {
      text = text.replace(`{${replaceKey}}`, replacements[replaceKey]);
    });
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSelector() {
  const { language, changeLanguage, t } = useLanguage();

  const languages = [
    { code: 'en', name: t('english'), flag: '🇬🇧' },
    { code: 'nl', name: t('dutch'), flag: '🇳🇱' },
    { code: 'fr', name: t('french'), flag: '🇫🇷' },
  ];

  const currentLang = languages.find(l => l.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{currentLang?.flag} {currentLang?.name}</span>
          <span className="sm:hidden">{currentLang?.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={language === lang.code ? 'bg-blue-50' : ''}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}