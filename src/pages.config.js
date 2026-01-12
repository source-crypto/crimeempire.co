import Auction from './pages/Auction';
import CaseDetail from './pages/CaseDetail';
import Cases from './pages/Cases';
import Crew from './pages/Crew';
import Dashboard from './pages/Dashboard';
import Enterprises from './pages/Enterprises';
import Garage from './pages/Garage';
import Governance from './pages/Governance';
import Heists from './pages/Heists';
import Home from './pages/Home';
import Metaverse from './pages/Metaverse';
import PlayerSetup from './pages/PlayerSetup';
import Settings from './pages/Settings';
import Territories from './pages/Territories';
import OfficerPerformance from './pages/OfficerPerformance';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Auction": Auction,
    "CaseDetail": CaseDetail,
    "Cases": Cases,
    "Crew": Crew,
    "Dashboard": Dashboard,
    "Enterprises": Enterprises,
    "Garage": Garage,
    "Governance": Governance,
    "Heists": Heists,
    "Home": Home,
    "Metaverse": Metaverse,
    "PlayerSetup": PlayerSetup,
    "Settings": Settings,
    "Territories": Territories,
    "OfficerPerformance": OfficerPerformance,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};