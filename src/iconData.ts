import {
  Calculator, Percent, Hash, Sigma, Pi, Radical, Plus, Minus, Divide, Equal,
  FlaskConical, TestTubes, Microscope, Atom, Dna, Brain, Thermometer, Magnet, Orbit, Telescope,
  BookOpen, GraduationCap, School, Pencil, Notebook, Ruler, Backpack, PenTool, Palette, Eraser, BookMarked, Paperclip,
  Music, Headphones, Mic, Volume, Guitar, Drum, Bell, Piano,
  Bird, Cat, Dog, Rabbit, Fish, TreeDeciduous, Flower, Leaf, Bug, Snail, Turtle, Squirrel, Sprout,
  Sun, Moon, Cloud, CloudRain, CloudSnow, Snowflake, Wind, Rainbow, Cloudy, Droplets,
  Trophy, Medal, Award, Dices, Puzzle, Gamepad, Bike, Target, Timer, Heart,
  User, Users, Hand, Smile, Frown, ThumbsUp, Eye, Baby, Accessibility,
  Euro, PoundSterling, DollarSign, Coins, Banknote, Wallet, PiggyBank, CreditCard, Receipt, BadgePercent,
  Apple, Cherry, Cookie, Cake, Pizza, Croissant, Coffee, Utensils, Candy, IceCreamCone,
  Car, Bus, Plane, TrainFront, Rocket, Ship, Sailboat, Tractor, Ambulance,
  Scissors, Wrench, Hammer, Key, Lock, Lightbulb, Zap, Battery, Plug,
  Phone, Mail, MessageCircle, Megaphone, Radio, Wifi, Globe, Send, Tv, Smartphone,
  Clock, AlarmClock, Hourglass, Calendar, Watch, History, Undo, CircleStop,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronUp, ChevronDown, Move, Compass, MapPin, Navigation, CornerDownRight, RotateCcw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

export const ICON_MAP: Record<string, LucideIcon> = {
  Calculator, Percent, Hash, Sigma, Pi, Radical, Plus, Minus, Divide, Equal,
  FlaskConical, TestTubes, Microscope, Atom, Dna, Brain, Thermometer, Magnet, Orbit, Telescope,
  BookOpen, GraduationCap, School, Pencil, Notebook, Ruler, Backpack, PenTool, Palette, Eraser, BookMarked, Paperclip,
  Music, Headphones, Mic, Volume, Guitar, Drum, Bell, Piano,
  Bird, Cat, Dog, Rabbit, Fish, TreeDeciduous, Flower, Leaf, Bug, Snail, Turtle, Squirrel, Sprout,
  Sun, Moon, Cloud, CloudRain, CloudSnow, Snowflake, Wind, Rainbow, Cloudy, Droplets,
  Trophy, Medal, Award, Dices, Puzzle, Gamepad, Bike, Target, Timer, Heart,
  User, Users, Hand, Smile, Frown, ThumbsUp, Eye, Baby, Accessibility,
  Euro, PoundSterling, DollarSign, Coins, Banknote, Wallet, PiggyBank, CreditCard, Receipt, BadgePercent,
  Apple, Cherry, Cookie, Cake, Pizza, Croissant, Coffee, Utensils, Candy, IceCreamCone,
  Car, Bus, Plane, TrainFront, Rocket, Ship, Sailboat, Tractor, Ambulance,
  Scissors, Wrench, Hammer, Key, Lock, Lightbulb, Zap, Battery, Plug,
  Phone, Mail, MessageCircle, Megaphone, Radio, Wifi, Globe, Send, Tv, Smartphone,
  Clock, AlarmClock, Hourglass, Calendar, Watch, History, Undo, CircleStop,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronUp, ChevronDown, Move, Compass, MapPin, Navigation, CornerDownRight, RotateCcw,
};

export const ICON_CATEGORIES: { label: string; icons: { name: string; label: string }[] }[] = [
  {
    label: 'Mathematiques',
    icons: [
      { name: 'Calculator', label: 'Calculatrice' },
      { name: 'Percent', label: 'Pourcentage' },
      { name: 'Hash', label: 'Diese' },
      { name: 'Sigma', label: 'Sigma' },
      { name: 'Pi', label: 'Pi' },
      { name: 'Radical', label: 'Racine' },
      { name: 'Plus', label: 'Plus' },
      { name: 'Minus', label: 'Moins' },
      { name: 'Divide', label: 'Diviser' },
      { name: 'Equal', label: 'Egal' },
    ],
  },
  {
    label: 'Sciences',
    icons: [
      { name: 'FlaskConical', label: 'Fiole' },
      { name: 'TestTubes', label: 'Tubes a essai' },
      { name: 'Microscope', label: 'Microscope' },
      { name: 'Atom', label: 'Atome' },
      { name: 'Dna', label: 'ADN' },
      { name: 'Brain', label: 'Cerveau' },
      { name: 'Thermometer', label: 'Thermometre' },
      { name: 'Magnet', label: 'Aimant' },
      { name: 'Orbit', label: 'Orbite' },
      { name: 'Telescope', label: 'Telescope' },
    ],
  },
  {
    label: 'Ecole',
    icons: [
      { name: 'BookOpen', label: 'Livre ouvert' },
      { name: 'GraduationCap', label: 'Diplome' },
      { name: 'School', label: 'Ecole' },
      { name: 'Pencil', label: 'Crayon' },
      { name: 'Notebook', label: 'Cahier' },
      { name: 'Ruler', label: 'Regle' },
      { name: 'Backpack', label: 'Cartable' },
      { name: 'PenTool', label: 'Stylo' },
      { name: 'Palette', label: 'Palette' },
      { name: 'Eraser', label: 'Gomme' },
      { name: 'BookMarked', label: 'Livre marque' },
      { name: 'Paperclip', label: 'Trombone' },
    ],
  },
  {
    label: 'Musique',
    icons: [
      { name: 'Music', label: 'Musique' },
      { name: 'Headphones', label: 'Casque' },
      { name: 'Mic', label: 'Micro' },
      { name: 'Volume', label: 'Volume' },
      { name: 'Guitar', label: 'Guitare' },
      { name: 'Drum', label: 'Tambour' },
      { name: 'Bell', label: 'Cloche' },
      { name: 'Piano', label: 'Piano' },
    ],
  },
  {
    label: 'Animaux & Nature',
    icons: [
      { name: 'Bird', label: 'Oiseau' },
      { name: 'Cat', label: 'Chat' },
      { name: 'Dog', label: 'Chien' },
      { name: 'Rabbit', label: 'Lapin' },
      { name: 'Fish', label: 'Poisson' },
      { name: 'TreeDeciduous', label: 'Arbre' },
      { name: 'Flower', label: 'Fleur' },
      { name: 'Leaf', label: 'Feuille' },
      { name: 'Bug', label: 'Insecte' },
      { name: 'Snail', label: 'Escargot' },
      { name: 'Turtle', label: 'Tortue' },
      { name: 'Squirrel', label: 'Ecureuil' },
      { name: 'Sprout', label: 'Pousse' },
    ],
  },
  {
    label: 'Meteo',
    icons: [
      { name: 'Sun', label: 'Soleil' },
      { name: 'Moon', label: 'Lune' },
      { name: 'Cloud', label: 'Nuage' },
      { name: 'CloudRain', label: 'Pluie' },
      { name: 'CloudSnow', label: 'Neige' },
      { name: 'Snowflake', label: 'Flocon' },
      { name: 'Wind', label: 'Vent' },
      { name: 'Rainbow', label: 'Arc-en-ciel' },
      { name: 'Cloudy', label: 'Nuageux' },
      { name: 'Droplets', label: 'Gouttes' },
    ],
  },
  {
    label: 'Sports & Jeux',
    icons: [
      { name: 'Trophy', label: 'Trophee' },
      { name: 'Medal', label: 'Medaille' },
      { name: 'Award', label: 'Recompense' },
      { name: 'Dices', label: 'Des' },
      { name: 'Puzzle', label: 'Puzzle' },
      { name: 'Gamepad', label: 'Manette' },
      { name: 'Bike', label: 'Velo' },
      { name: 'Target', label: 'Cible' },
      { name: 'Timer', label: 'Chrono' },
      { name: 'Heart', label: 'Coeur' },
    ],
  },
  {
    label: 'Personnes',
    icons: [
      { name: 'User', label: 'Personne' },
      { name: 'Users', label: 'Groupe' },
      { name: 'Hand', label: 'Main' },
      { name: 'Smile', label: 'Sourire' },
      { name: 'Frown', label: 'Triste' },
      { name: 'ThumbsUp', label: 'Pouce' },
      { name: 'Eye', label: 'Oeil' },
      { name: 'Baby', label: 'Bebe' },
      { name: 'Accessibility', label: 'Accessibilite' },
    ],
  },
  {
    label: 'Monnaie',
    icons: [
      { name: 'Euro', label: 'Euro' },
      { name: 'PoundSterling', label: 'Livre' },
      { name: 'DollarSign', label: 'Dollar' },
      { name: 'Coins', label: 'Pieces' },
      { name: 'Banknote', label: 'Billet' },
      { name: 'Wallet', label: 'Portefeuille' },
      { name: 'PiggyBank', label: 'Tirelire' },
      { name: 'CreditCard', label: 'Carte' },
      { name: 'Receipt', label: 'Ticket' },
      { name: 'BadgePercent', label: 'Soldes' },
    ],
  },
  {
    label: 'Nourriture',
    icons: [
      { name: 'Apple', label: 'Pomme' },
      { name: 'Cherry', label: 'Cerise' },
      { name: 'Cookie', label: 'Cookie' },
      { name: 'Cake', label: 'Gateau' },
      { name: 'Pizza', label: 'Pizza' },
      { name: 'Croissant', label: 'Croissant' },
      { name: 'Coffee', label: 'Cafe' },
      { name: 'Utensils', label: 'Couverts' },
      { name: 'Candy', label: 'Bonbon' },
      { name: 'IceCreamCone', label: 'Glace' },
    ],
  },
  {
    label: 'Transport',
    icons: [
      { name: 'Car', label: 'Voiture' },
      { name: 'Bus', label: 'Bus' },
      { name: 'Plane', label: 'Avion' },
      { name: 'TrainFront', label: 'Train' },
      { name: 'Rocket', label: 'Fusee' },
      { name: 'Ship', label: 'Bateau' },
      { name: 'Sailboat', label: 'Voilier' },
      { name: 'Tractor', label: 'Tracteur' },
      { name: 'Ambulance', label: 'Ambulance' },
    ],
  },
  {
    label: 'Outils',
    icons: [
      { name: 'Scissors', label: 'Ciseaux' },
      { name: 'Wrench', label: 'Cle' },
      { name: 'Hammer', label: 'Marteau' },
      { name: 'Key', label: 'Cle' },
      { name: 'Lock', label: 'Cadenas' },
      { name: 'Lightbulb', label: 'Ampoule' },
      { name: 'Zap', label: 'Eclair' },
      { name: 'Battery', label: 'Pile' },
      { name: 'Plug', label: 'Prise' },
    ],
  },
  {
    label: 'Communication',
    icons: [
      { name: 'Phone', label: 'Telephone' },
      { name: 'Mail', label: 'Courrier' },
      { name: 'MessageCircle', label: 'Message' },
      { name: 'Megaphone', label: 'Megaphone' },
      { name: 'Radio', label: 'Radio' },
      { name: 'Wifi', label: 'Wifi' },
      { name: 'Globe', label: 'Globe' },
      { name: 'Send', label: 'Envoyer' },
      { name: 'Tv', label: 'Television' },
      { name: 'Smartphone', label: 'Mobile' },
    ],
  },
  {
    label: 'Temps',
    icons: [
      { name: 'Clock', label: 'Horloge' },
      { name: 'AlarmClock', label: 'Reveil' },
      { name: 'Hourglass', label: 'Sablier' },
      { name: 'Calendar', label: 'Calendrier' },
      { name: 'Watch', label: 'Montre' },
      { name: 'History', label: 'Historique' },
      { name: 'Undo', label: 'Retour' },
      { name: 'CircleStop', label: 'Stop' },
    ],
  },
  {
    label: 'Fleches',
    icons: [
      { name: 'ArrowUp', label: 'Haut' },
      { name: 'ArrowDown', label: 'Bas' },
      { name: 'ArrowLeft', label: 'Gauche' },
      { name: 'ArrowRight', label: 'Droite' },
      { name: 'ChevronUp', label: 'Chevron haut' },
      { name: 'ChevronDown', label: 'Chevron bas' },
      { name: 'Move', label: 'Deplacer' },
      { name: 'Compass', label: 'Boussole' },
      { name: 'MapPin', label: 'Repere' },
      { name: 'Navigation', label: 'Navigation' },
      { name: 'CornerDownRight', label: 'Coin' },
      { name: 'RotateCcw', label: 'Rotation' },
    ],
  },
];

// Image cache: key = "iconName-color-size"
const imageCache = new Map<string, HTMLImageElement>();

export function getIconImage(
  iconName: string,
  color: string,
  size: number,
  onLoad: () => void,
): HTMLImageElement | null {
  const key = `${iconName}-${color}-${size}`;
  const cached = imageCache.get(key);
  if (cached && cached.complete) return cached;
  if (cached) return null; // still loading

  const IconComp = ICON_MAP[iconName];
  if (!IconComp) return null;

  const svgMarkup = renderToStaticMarkup(
    createElement(IconComp, { size, color, strokeWidth: 2 }),
  );

  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMarkup);
  const img = new Image();
  img.src = dataUrl;
  imageCache.set(key, img);

  img.onload = onLoad;

  return img.complete ? img : null;
}
