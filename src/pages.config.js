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
import Auction from './pages/Auction';
import Crew from './pages/Crew';
import Enterprises from './pages/Enterprises';
import Garage from './pages/Garage';
import Governance from './pages/Governance';
import Heists from './pages/Heists';
import Home from './pages/Home';
import Metaverse from './pages/Metaverse';
import PlayerSetup from './pages/PlayerSetup';
import Territories from './pages/Territories';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import Combat from './pages/Combat';
import Earnings from './pages/Earnings';
import Skills from './pages/Skills';
import Syndicates from './pages/Syndicates';
import Trading from './pages/Trading';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Auction": Auction,
    "Crew": Crew,
    "Enterprises": Enterprises,
    "Garage": Garage,
    "Governance": Governance,
    "Heists": Heists,
    "Home": Home,
    "Metaverse": Metaverse,
    "PlayerSetup": PlayerSetup,
    "Territories": Territories,
    "Dashboard": Dashboard,
    "Settings": Settings,
    "Cases": Cases,
    "CaseDetail": CaseDetail,
    "Combat": Combat,
    "Earnings": Earnings,
    "Skills": Skills,
    "Syndicates": Syndicates,
    "Trading": Trading,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};