/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIEmployees from './pages/AIEmployees';
import Embassy from './pages/Embassy';
import FleetManagement from './pages/FleetManagement';
import AIManagement from './pages/AIManagement';
import Auction from './pages/Auction';
import BaseManagement from './pages/BaseManagement';
import BlackMarket from './pages/BlackMarket';
import CaseDetail from './pages/CaseDetail';
import Cases from './pages/Cases';
import Combat from './pages/Combat';
import ContrabandCaches from './pages/ContrabandCaches';
import Crew from './pages/Crew';
import CrimeMap from './pages/CrimeMap';
import Dashboard from './pages/Dashboard';
import Earnings from './pages/Earnings';
import Enterprises from './pages/Enterprises';
import Factions from './pages/Factions';
import GameDocumentation from './pages/GameDocumentation';
import Garage from './pages/Garage';
import GettingStarted from './pages/GettingStarted';
import Governance from './pages/Governance';
import Heists from './pages/Heists';
import Home from './pages/Home';
import Investigations from './pages/Investigations';
import ItemsCenter from './pages/ItemsCenter';
import MacroEconomics from './pages/MacroEconomics';
import Messages from './pages/Messages';
import Metaverse from './pages/Metaverse';
import MoneyLaundering from './pages/MoneyLaundering';
import P2PTrading from './pages/P2PTrading';
import Performance from './pages/Performance';
import PlayerHideout from './pages/PlayerHideout';
import PlayerManagement from './pages/PlayerManagement';
import PlayerSetup from './pages/PlayerSetup';
import ProductionManagement from './pages/ProductionManagement';
import Reputation from './pages/Reputation';
import Settings from './pages/Settings';
import Skills from './pages/Skills';
import Strategy from './pages/Strategy';
import SupplyChainNetwork from './pages/SupplyChainNetwork';
import Syndicates from './pages/Syndicates';
import TeamManagement from './pages/TeamManagement';
import Territories from './pages/Territories';
import Trading from './pages/Trading';
import Tutorial from './pages/Tutorial';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIEmployees": AIEmployees,
    "Embassy": Embassy,
    "FleetManagement": FleetManagement,
    "AIManagement": AIManagement,
    "Auction": Auction,
    "BaseManagement": BaseManagement,
    "BlackMarket": BlackMarket,
    "CaseDetail": CaseDetail,
    "Cases": Cases,
    "Combat": Combat,
    "ContrabandCaches": ContrabandCaches,
    "Crew": Crew,
    "CrimeMap": CrimeMap,
    "Dashboard": Dashboard,
    "Earnings": Earnings,
    "Enterprises": Enterprises,
    "Factions": Factions,
    "GameDocumentation": GameDocumentation,
    "Garage": Garage,
    "GettingStarted": GettingStarted,
    "Governance": Governance,
    "Heists": Heists,
    "Home": Home,
    "Investigations": Investigations,
    "ItemsCenter": ItemsCenter,
    "MacroEconomics": MacroEconomics,
    "Messages": Messages,
    "Metaverse": Metaverse,
    "MoneyLaundering": MoneyLaundering,
    "P2PTrading": P2PTrading,
    "Performance": Performance,
    "PlayerHideout": PlayerHideout,
    "PlayerManagement": PlayerManagement,
    "PlayerSetup": PlayerSetup,
    "ProductionManagement": ProductionManagement,
    "Reputation": Reputation,
    "Settings": Settings,
    "Skills": Skills,
    "Strategy": Strategy,
    "SupplyChainNetwork": SupplyChainNetwork,
    "Syndicates": Syndicates,
    "TeamManagement": TeamManagement,
    "Territories": Territories,
    "Trading": Trading,
    "Tutorial": Tutorial,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};